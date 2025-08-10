import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { storage } from "@/lib/storage";
import { questionnaireDef, scoreAnswers, isQuestionVisible, GapSeverity, ApplicabilityProfile } from "@/lib/logicEngine";
import { ArrowLeft, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {}

// Specialized terms and their definitions
const SPECIALIZED_TERMS: Record<string, string> = {
  "board responsibility": "The formal duty assigned to a company's board of directors to oversee climate-related risks and strategies.",
  "climate-related risks": "Potential negative impacts on the organisation caused by climate change, including transition and physical risks.",
  "transition risks": "Risks related to the shift to a low-carbon economy, such as policy changes, market shifts, or technology changes.",
  "physical risks": "Risks from climate-related physical events, such as extreme weather, floods, droughts, and rising sea levels.",
  "climate competence": "Knowledge and expertise of board members or advisors in climate science, policy, or sustainability matters.",
  "scenario analysis": "A process of assessing how an organisation's strategy performs under different future climate scenarios (e.g., 1.5°C warming).",
  "short, medium, and long term": "Time horizons typically considered in climate reporting: short (up to 3 years), medium (3-10 years), long (beyond 10 years).",
  "transition plan": "A strategic roadmap for shifting business operations towards low-carbon and climate-resilient practices.",
  "enterprise risk management": "Organisation-wide processes to identify, assess, and manage all types of risks, including climate risks.",
  "Scope 1": "Direct greenhouse gas emissions from owned or controlled sources (e.g., fuel combustion on-site).",
  "Scope 2": "Indirect emissions from purchased electricity, steam, heating, and cooling consumed by the organisation.",
  "Scope 3": "Indirect emissions from the organisation's value chain, including suppliers, product use, and waste disposal.",
  "GHG emissions": "Greenhouse gas emissions, including CO2, methane, nitrous oxide, and other gases contributing to climate change.",
  "disclosed externally": "Information made publicly available, typically in sustainability or financial reports.",
  "third-party assured": "Verified or audited by an independent external party to confirm accuracy and reliability.",
  "climate-related opportunities": "Positive impacts or benefits that may arise from climate change, such as new markets, products, or efficiency gains.",
  "business model": "The way an organisation creates, delivers, and captures value, including how climate risks and opportunities affect this.",
  "value chain": "The full range of activities involved in creating and delivering a product or service, from suppliers to end customers.",
  "financial impact": "The monetary effects of climate-related risks and opportunities on the organisation's financial position and performance.",
  "climate resilience": "The ability of an organisation to anticipate, prepare for, and adapt to climate-related changes and disruptions.",
  "targets": "Specific, measurable goals for reducing emissions or improving climate performance over defined time periods.",
  "metrics": "Quantifiable measures used to track and report on climate-related performance and progress.",
  "governance": "The systems and processes for overseeing climate-related risks and opportunities at board and management levels.",
  "strategy": "How climate-related risks and opportunities are integrated into business planning and decision-making.",
  "risk management": "Processes for identifying, assessing, and managing climate-related risks and opportunities.",
  "metrics & targets": "Measurement systems and specific goals for tracking climate-related performance and progress."
};

// Component to render text with highlighted terms and tooltips
const HighlightedText = ({ text }: { text: string }) => {
  const [hoveredTerm, setHoveredTerm] = useState<string | null>(null);
  
  // Function to highlight specialized terms in text and return React elements
  const renderHighlightedText = (text: string) => {
    if (!text) return text;
    
    let highlightedText = text;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Sort terms by length (longest first) to avoid partial matches
    const sortedTerms = Object.keys(SPECIALIZED_TERMS).sort((a, b) => b.length - a.length);
    
    sortedTerms.forEach(term => {
      const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = [...highlightedText.matchAll(regex)];
      
      matches.forEach(match => {
        const startIndex = match.index!;
        const endIndex = startIndex + match[0].length;
        
        // Add text before the match
        if (startIndex > lastIndex) {
          elements.push(highlightedText.slice(lastIndex, startIndex));
        }
        
        // Add the highlighted term
        const termKey = term.toLowerCase();
        elements.push(
          <Tooltip key={`${startIndex}-${termKey}`}>
            <TooltipTrigger asChild>
              <span 
                className="bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded cursor-help border-b border-dashed border-yellow-400 transition-all duration-200 hover:bg-yellow-200 hover:text-yellow-900"
                onMouseEnter={() => setHoveredTerm(termKey)}
                onMouseLeave={() => setHoveredTerm(null)}
              >
                {match[0]}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="font-medium">{term}</p>
              <p className="text-sm">{SPECIALIZED_TERMS[term]}</p>
            </TooltipContent>
          </Tooltip>
        );
        
        lastIndex = endIndex;
      });
    });
    
    // Add remaining text
    if (lastIndex < highlightedText.length) {
      elements.push(highlightedText.slice(lastIndex));
    }
    
    return elements.length > 0 ? elements : text;
  };

  return (
    <div className="leading-relaxed">
      {renderHighlightedText(text)}
    </div>
  );
};

export default function QuestionnaireRenderer(_: Props) {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, { severity: GapSeverity | null; na?: boolean }>>({});
  const [profile, setProfile] = useState<ApplicabilityProfile | null>(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);

  // Load/save
  useEffect(() => {
    const saved = storage.getQuestionnaire();
    if (saved) setAnswers(saved);
    const classification = storage.getClassification();
    // Build applicability profile or block if missing
    if (!classification || !classification.group) {
      setProfile(null);
    } else {
      const entityGroup = (classification.group === 'not-required' ? 'voluntary' : classification.group) as ApplicabilityProfile["entityGroup"];
      const firstReportingFY = classification.reportingStart || "";
      setProfile({ entityGroup, firstReportingFY });
    }
  }, []);

  useEffect(() => {
    storage.saveQuestionnaire(answers);
  }, [answers]);

  const currentSection = questionnaireDef.sections[sectionIndex];
  const visibleQuestions = useMemo(() => {
    if (!profile) return [];
    return currentSection.questions.filter(q => isQuestionVisible(q, answers, profile).visible);
  }, [currentSection, answers, profile]);
  const currentQuestion = visibleQuestions[questionIndex];

  // Handle navigation against visible questions only
  const isFirstSection = sectionIndex === 0;
  const isLastSection = sectionIndex === questionnaireDef.sections.length - 1;
  const isFirstQuestion = questionIndex === 0;
  const isLastQuestion = questionIndex === visibleQuestions.length - 1;

  // Progress
  const scoring = useMemo(() => profile ? scoreAnswers(answers, profile) : null, [answers, profile]);
  const totalVisibleQuestions = useMemo(() => {
    if (!profile) return 0;
    return questionnaireDef.sections.reduce((sum, s) => {
      return sum + s.questions.filter(q => isQuestionVisible(q, answers, profile).visible).length;
    }, 0);
  }, [answers, profile]);
  const answeredVisible = useMemo(() => {
    if (!profile || !scoring) return 0;
    return Array.from(scoring.visibleQuestionIds).filter(id => {
      const ans = answers[id];
      return ans && (ans.severity !== null && ans.severity !== undefined);
    }).length;
  }, [scoring, answers, profile]);
  const progress = totalVisibleQuestions > 0 ? Math.round((answeredVisible / totalVisibleQuestions) * 100) : 0;

  const setAnswer = (value: GapSeverity | 'na') => {
    if (!currentQuestion) return;
    setAnswers(prev => ({ 
      ...prev, 
      [currentQuestion.id]: value === 'na' ? { severity: 0, na: true } : { severity: value as GapSeverity } 
    }));
  };

  const gotoNext = () => {
    if (isLastQuestion) {
      if (isLastSection) {
        navigate("/dashboard");
      } else {
        setSectionIndex(i => i + 1);
        setQuestionIndex(0);
      }
    } else {
      setQuestionIndex(i => i + 1);
    }
  };

  const gotoPrev = () => {
    if (isFirstQuestion) {
      if (isFirstSection) {
        navigate("/welcome");
      } else {
        const prevSectionIndex = sectionIndex - 1;
        const prevVisible = questionnaireDef.sections[prevSectionIndex].questions.filter(q => {
          if (!profile) return false;
          return isQuestionVisible(q, answers, profile).visible;
        });
        setSectionIndex(prevSectionIndex);
        setQuestionIndex(Math.max(prevVisible.length - 1, 0));
      }
    } else {
      setQuestionIndex(i => i - 1);
    }
  };

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <h2 className="text-2xl font-semibold">Complete Applicability First</h2>
        <p className="text-muted-foreground mt-2">We need your entity group and first reporting FY before starting the assessment.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">AASB S2 Readiness Assessment</h1>
          <p className="text-muted-foreground">Answer questions to see your live readiness score and urgency.</p>
        </div>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Section {sectionIndex + 1} of {questionnaireDef.sections.length}</span>
              <span className="font-medium">{currentSection.title}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-muted-foreground">{answeredVisible} of {totalVisibleQuestions} visible questions answered</span>
              <span className="font-medium">Readiness: <Badge variant="outline">{scoring?.readiness ?? '—'}</Badge></span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-card md:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Sections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {questionnaireDef.sections.map((s, i) => (
                <Button key={s.id} variant={i === sectionIndex ? "default" : "outline"} size="sm" className="w-full justify-start" onClick={() => { setSectionIndex(i); setQuestionIndex(0); }}>
                  {s.title}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-card md:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline">{currentSection.title}</Badge>
                <div className="flex items-center gap-2 text-sm">
                  <span>Question {questionIndex + 1} of {visibleQuestions.length}</span>
                  {answers[currentQuestion?.id || ""] ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  )}
                </div>
              </div>
              <CardTitle className="text-lg leading-relaxed">
                {currentQuestion ? (
                  <HighlightedText text={currentQuestion.question} />
                ) : (
                  "No questions visible in this section based on your answers."
                )}
              </CardTitle>
            </CardHeader>
            {currentQuestion && (
              <CardContent className="space-y-4">
                <RadioGroup 
                  value={(answers[currentQuestion.id]?.na ? 'na' : (answers[currentQuestion.id]?.severity ?? '').toString())} 
                  onValueChange={(v) => setAnswer(v === 'na' ? 'na' : Number(v) as GapSeverity)} 
                  className="space-y-3"
                >
                  {currentQuestion.answers.map((answer, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                      <RadioGroupItem id={`${currentQuestion.id}-${answer.score}`} value={answer.score.toString()} />
                      <Label htmlFor={`${currentQuestion.id}-${answer.score}`} className="flex-1 cursor-pointer">
                        <HighlightedText text={answer.label} />
                      </Label>
                    </div>
                  ))}
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                    <RadioGroupItem id={`${currentQuestion.id}-na`} value={'na'} />
                    <Label htmlFor={`${currentQuestion.id}-na`} className="flex-1 cursor-pointer">Not applicable</Label>
                  </div>
                </RadioGroup>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={gotoPrev}><ArrowLeft className="w-4 h-4 mr-1" /> Previous</Button>
                  <Button onClick={gotoNext} variant="sustainability">{isLastSection && isLastQuestion ? "Finish & View Dashboard" : "Next"} <ArrowRight className="w-4 h-4 ml-1" /></Button>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}


