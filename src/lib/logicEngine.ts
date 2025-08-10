import data from "./aasbS2.json";

// Updated model to work with new questionnaire structure
// New structure has individual questions with sections, weights, urgency rules, and skip conditions

export type GapSeverity = 0 | 1 | 2 | 3 | 4; // Updated to 0-4 scale

export type EntityGroup = 1 | 2 | 3 | "voluntary";

export interface ApplicabilityProfile {
  entityGroup: EntityGroup;
  firstReportingFY: string; // YYYY
}

export interface SkipCondition {
  questionId: string;
  minScore: number;
}

export interface UrgencyRule {
  condition: string;
  urgency: "High" | "Medium" | "Low";
}

export interface Answer {
  label: string;
  score: number;
}

export interface QuestionDef {
  id: string;
  section: string;
  question: string;
  answers: Answer[];
  weight: number;
  skipCondition: SkipCondition | null;
  urgencyRules: UrgencyRule[];
  gapDescription?: string;
  recommendation?: string;
  relevantClause?: string;
}

export interface QuestionnaireData {
  questionnaire: QuestionDef[];
  metadata: {
    title: string;
    version: string;
    description: string;
    sections: Array<{
      id: string;
      title: string;
      description: string;
    }>;
    scoring: {
      description: string;
      levels: Array<{
        score: number;
        description: string;
      }>;
    };
    urgency: {
      description: string;
      levels: Array<{
        level: string;
        description: string;
      }>;
    };
  };
}

export interface AnswersMap {
  [questionId: string]: { severity: GapSeverity | null; na?: boolean };
}

export interface SectionScore {
  sectionId: string;
  sectionTitle: string;
  sectionScore: number;
  criticalCount: number;
  urgencyLevel: "High" | "Medium" | "Low";
}

export interface ScoringResult {
  sectionScores: SectionScore[];
  totalScore: number;
  readiness: "High" | "Moderate" | "Low";
  visibleQuestionIds: Set<string>;
  weightedPerQuestion: Record<string, number>;
  urgencyBreakdown: {
    High: number;
    Medium: number;
    Low: number;
  };
  gapsDetailed: GapDetail[];
  gapGroups: {
    High: GapDetail[];
    Medium: GapDetail[];
    Low: GapDetail[];
  };
}

export interface GapDetail {
  id: string;
  clause: string; // e.g., G1
  section: string; // e.g., Governance
  question: string;
  severity: GapSeverity | null;
  na: boolean;
  weight: number; // question weight (not multiplied by severity)
  weightedScore: number; // severity * weight (0 when NA)
  urgency: "High" | "Medium" | "Low";
  priority: "High" | "Medium" | "Low";
  description: string; // kept for backward compatibility; mirrors gapDescription
  gapDescription?: string;
  recommendation?: string;
  relevantClause?: string;
}

const questionnaireData = data as QuestionnaireData;

export const questionnaireDef = {
  sections: questionnaireData.metadata.sections.map(section => ({
    id: section.id,
    title: section.title,
    description: section.description,
    questions: questionnaireData.questionnaire.filter(q => q.section === section.title)
  }))
};

export function getGroupMultiplier(group: EntityGroup): number {
  if (group === 1) return 1.5;
  if (group === 2) return 1.2;
  if (group === 3) return 1.0;
  return 0.6; // voluntary
}

export function computeUrgencyWeight(question: QuestionDef, profile: ApplicabilityProfile): number {
  const sectionId = question.section.toLowerCase().replace(/\s+/, '');
  return question.weight * getGroupMultiplier(profile.entityGroup);
}

export function isQuestionVisible(question: QuestionDef, answers: AnswersMap, profile: ApplicabilityProfile): { visible: boolean; enforced?: { na?: boolean; severity?: GapSeverity } } {
  if (!question.skipCondition) {
    return { visible: true };
  }

  const prerequisiteAnswer = answers[question.skipCondition.questionId];
  if (!prerequisiteAnswer || prerequisiteAnswer.severity === null || prerequisiteAnswer.severity === undefined) {
    return { visible: true }; // Show if prerequisite not answered yet
  }

  if (prerequisiteAnswer.severity < question.skipCondition.minScore) {
    return { visible: false };
  }

  return { visible: true };
}

export function evaluateUrgency(question: QuestionDef, answer: AnswersMap[string]): "High" | "Medium" | "Low" {
  if (!answer || answer.severity === null || answer.severity === undefined) {
    return "Medium"; // Default for unanswered questions
  }

  const score = answer.severity;
  const weight = question.weight;

  for (const rule of question.urgencyRules) {
    const condition = rule.condition;
    
    // Parse condition like "score<2 && weight>=8"
    if (condition.includes("score<2") && condition.includes("weight>=8")) {
      if (score < 2 && weight >= 8) return rule.urgency as "High" | "Medium" | "Low";
    } else if (condition.includes("score<2") && condition.includes("weight<8")) {
      if (score < 2 && weight < 8) return rule.urgency as "High" | "Medium" | "Low";
    } else if (condition.includes("score==2")) {
      if (score === 2) return rule.urgency as "High" | "Medium" | "Low";
    } else if (condition.includes("score>=3")) {
      if (score >= 3) return rule.urgency as "High" | "Medium" | "Low";
    }
  }

  return "Medium"; // Default fallback
}

export function scoreAnswers(answers: AnswersMap, profile: ApplicabilityProfile): ScoringResult {
  const visibleQuestionIds = new Set<string>();
  const weightedPerQuestion: Record<string, number> = {};
  const sectionScores: SectionScore[] = [];
  let totalScore = 0;
  const urgencyBreakdown = { High: 0, Medium: 0, Low: 0 };
  const gapsDetailed: GapDetail[] = [];
  const gapGroups = { High: [] as GapDetail[], Medium: [] as GapDetail[], Low: [] as GapDetail[] };

  // Group questions by section
  const questionsBySection = questionnaireData.questionnaire.reduce((acc, question) => {
    if (!acc[question.section]) {
      acc[question.section] = [];
    }
    acc[question.section].push(question);
    return acc;
  }, {} as Record<string, QuestionDef[]>);

  Object.entries(questionsBySection).forEach(([sectionTitle, questions]) => {
    let sectionSum = 0;
    let criticalCount = 0;
    let sectionUrgencyCounts = { High: 0, Medium: 0, Low: 0 };

    questions.forEach(question => {
      const visibility = isQuestionVisible(question, answers, profile);
      
      if (!visibility.visible) {
        return;
      }

      visibleQuestionIds.add(question.id);
      
      const answer = answers[question.id];
      const severity = answer?.severity ?? 2; // Default midpoint for unanswered
      const na = !!answer?.na;

      const weighted = na ? 0 : severity * question.weight;
      sectionSum += weighted;
      totalScore += weighted;
      weightedPerQuestion[question.id] = weighted;

      if (weighted > 3) criticalCount++;

      // Evaluate urgency
      const urgency = evaluateUrgency(question, answer);
      sectionUrgencyCounts[urgency]++;
      urgencyBreakdown[urgency]++;

      // Determine if this is a gap
      // Gap identification rules:
      // - Non-compliance or partial compliance: severity < 3 (0,1,2)
      // - Near-term readiness (by weight bucket) or high urgency raises priority
      // Gap: any non-NA answer below maximum maturity (score 4)
      const nonOrPartial = !na && severity !== null && severity !== undefined && severity < 4;
      if (nonOrPartial) {
        const weightBucket = question.weight >= 8 ? 3 : question.weight >= 5 ? 2 : 1;
        const urgencyScore = urgency === "High" ? 3 : urgency === "Medium" ? 2 : 1;
        const priorityScore = Math.max(weightBucket, urgencyScore);
        const priority: "High" | "Medium" | "Low" = priorityScore >= 3 ? "High" : priorityScore === 2 ? "Medium" : "Low";

        const detail: GapDetail = {
          id: question.id,
          clause: question.id,
          section: question.section,
          question: question.question,
          severity,
          na,
          weight: question.weight,
          weightedScore: weighted,
          urgency,
          priority,
          description: question.gapDescription || `Clause ${question.id} — ${question.question}`,
          gapDescription: question.gapDescription,
          recommendation: question.recommendation,
          relevantClause: question.relevantClause
        };
        gapsDetailed.push(detail);
        gapGroups[priority].push(detail);
      }
    });

    // Determine section urgency (highest priority wins)
    let sectionUrgency: "High" | "Medium" | "Low" = "Low";
    if (sectionUrgencyCounts.High > 0) sectionUrgency = "High";
    else if (sectionUrgencyCounts.Medium > 0) sectionUrgency = "Medium";

    sectionScores.push({
      sectionId: sectionTitle.toLowerCase().replace(/\s+/, ''),
      sectionTitle,
      sectionScore: parseFloat(sectionSum.toFixed(2)),
      criticalCount,
      urgencyLevel: sectionUrgency
    });
  });

  // Determine overall readiness
  let readiness: ScoringResult["readiness"];
  if (totalScore <= 20) readiness = "High";
  else if (totalScore <= 40) readiness = "Moderate";
  else readiness = "Low";

  return {
    sectionScores,
    totalScore: parseFloat(totalScore.toFixed(2)),
    readiness,
    visibleQuestionIds,
    weightedPerQuestion,
    urgencyBreakdown,
    gapsDetailed,
    gapGroups
  };
}

// Legacy function for backward compatibility
export function scoreAnswersV2(answers: AnswersMap, profile: ApplicabilityProfile): ScoringResult {
  return scoreAnswers(answers, profile);
}

// Legacy function for backward compatibility
export function isQuestionVisibleV2(question: any, answers: AnswersMap, profile: ApplicabilityProfile): { visible: boolean; enforced?: { na?: boolean; severity?: GapSeverity } } {
  // This is a simplified version for backward compatibility
  return { visible: true };
}



