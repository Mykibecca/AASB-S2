import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowRight, Building, FileText, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { storage } from "@/lib/storage";

interface AssessmentResult {
  inScope: boolean;
  classificationGroup: 1 | 2 | 3 | 'voluntary';
  mandatoryStartDate: string; // ISO date string
  reasoning: string[];
}

export default function ReadinessCheck() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);

  const questions = [
    {
      id: "company-name",
      question: "Company Name (Optional)",
      description: "Enter your company name for reference",
      type: "text",
      optional: true
    },
    {
      id: "industry",
      question: "Industry Sector",
      description: "Select your industry sector",
      type: "select",
      options: [
        { value: "agriculture", label: "Agriculture, Forestry & Fishing" },
        { value: "mining", label: "Mining" },
        { value: "manufacturing", label: "Manufacturing" },
        { value: "utilities", label: "Electricity, Gas, Water & Waste Services" },
        { value: "construction", label: "Construction" },
        { value: "retail", label: "Wholesale & Retail Trade" },
        { value: "accommodation", label: "Accommodation & Food Services" },
        { value: "transport", label: "Transport, Postal & Warehousing" },
        { value: "information", label: "Information Media & Telecommunications" },
        { value: "financial", label: "Financial & Insurance Services" },
        { value: "rental", label: "Rental, Hiring & Real Estate Services" },
        { value: "professional", label: "Professional, Scientific & Technical Services" },
        { value: "administrative", label: "Administrative & Support Services" },
        { value: "public", label: "Public Administration & Safety" },
        { value: "education", label: "Education & Training" },
        { value: "health", label: "Health Care & Social Assistance" },
        { value: "arts", label: "Arts & Recreation Services" },
        { value: "other", label: "Other Services" }
      ]
    },
    {
      id: "entity-type",
      question: "Entity Type",
      description: "Select the type that best describes your entity",
      type: "select",
      options: [
        { value: "for-profit", label: "For-profit" },
        { value: "not-for-profit", label: "Not-for-profit" },
        { value: "super-or-financial", label: "Superannuation fund / Financial institution" },
        { value: "other", label: "Other" },
      ]
    },
    {
      id: "chapter-2m",
      question: "Do you prepare annual financial reports under Chapter 2M of the Corporations Act?",
      description: "If No, you are out of mandatory scope (Voluntary only).",
      type: "radio",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
        { value: "unsure", label: "Unsure" },
      ]
    },
    {
      id: "revenue-2025",
      question: "Annual consolidated revenue for the most recent financial year",
      description: "Select a range",
      type: "select",
      options: [
        { value: "lt-50m", label: "Less than $50,000,000" },
        { value: "50m-199999999", label: "$50,000,000 to $199,999,999" },
        { value: "200m-499999999", label: "$200,000,000 to $499,999,999" },
        { value: "gte-500m", label: "$500,000,000 or more" },
      ]
    },
    {
      id: "assets-2025",
      question: "Consolidated gross assets at the end of the financial year",
      description: "Select a range",
      type: "select",
      options: [
        { value: "lt-25m", label: "Less than $25,000,000" },
        { value: "25m-99999999", label: "$25,000,000 to $99,999,999" },
        { value: "500m-999999999", label: "$500,000,000 to $999,999,999" },
        { value: "gte-1b", label: "$1,000,000,000 or more" },
      ]
    },
    {
      id: "employees-2025",
      question: "Number of employees (FTE)",
      description: "Select a range",
      type: "select",
      options: [
        { value: "lt-100", label: "Less than 100" },
        { value: "100-249", label: "100 to 249" },
        { value: "250-499", label: "250 to 499" },
        { value: "gte-500", label: "500 or more" },
      ]
    },
    {
      id: "nger-reporter",
      question: "Are you an NGER reporter?",
      description: "National Greenhouse and Energy Reporting",
      type: "radio",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ]
    },
    {
      id: "aum-over-5b",
      question: "Are you a super fund / financial institution with assets under management > $5,000,000,000?",
      description: "Answer Yes if AUM exceeds $5B",
      type: "radio",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ]
    },
  ];

  // Load answers from localStorage on component mount
  useEffect(() => {
    const savedAnswers = storage.getDisclosureEligibility();
    if (savedAnswers && Object.keys(savedAnswers).length > 0) {
      setAnswers(savedAnswers);
    }
  }, []);

  const handleAnswerChange = (questionId: string, value: string) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);
    storage.saveDisclosureEligibility(newAnswers);
  };

  const assessEligibility = (): AssessmentResult => {
    const reasoning: string[] = [];

    // Question references
    const chapter2m = answers['chapter-2m'];
    const revenue = answers['revenue-2025'];
    const assets = answers['assets-2025'];
    const employees = answers['employees-2025'];
    const nger = answers['nger-reporter'];
    const aumOver5b = answers['aum-over-5b'];

    // Chapter 2M gate
    if (chapter2m === 'no') {
      reasoning.push('Not preparing annual financial reports under Chapter 2M of the Corporations Act. Out of mandatory scope.');
      return {
        inScope: false,
        classificationGroup: 'voluntary',
        mandatoryStartDate: '',
        reasoning,
      };
    }

    // Size thresholds (>= 2 of 3)
    const revenueThresholdMet = revenue && revenue !== 'lt-50m';
    const assetsThresholdMet = assets && assets !== 'lt-25m';
    const employeesThresholdMet = employees && employees !== 'lt-100';
    const sizeThresholdsMet = [revenueThresholdMet, assetsThresholdMet, employeesThresholdMet].filter(Boolean).length;

    const ngerReporter = nger === 'yes';
    const superAumOver5b = aumOver5b === 'yes';

    const inScope = sizeThresholdsMet >= 2 || ngerReporter || superAumOver5b || chapter2m === 'yes';

    if (!inScope) {
      reasoning.push('Entity does not meet any in-scope conditions (size thresholds, NGER, or AUM > $5B).');
      return {
        inScope: false,
        classificationGroup: 'voluntary',
        mandatoryStartDate: '',
        reasoning,
      };
    }

    // Determine group by size bracket intensity (assumption due to unspecified group criteria)
    const bracketIndex = (val: string | undefined, order: string[]): number => (val ? Math.max(0, order.indexOf(val)) : 0);
    const revenueOrder = ['lt-50m', '50m-199999999', '200m-499999999', 'gte-500m'];
    const assetsOrder = ['lt-25m', '25m-99999999', '500m-999999999', 'gte-1b'];
    const employeesOrder = ['lt-100', '100-249', '250-499', 'gte-500'];

    let sizeScore = Math.max(
      bracketIndex(revenue, revenueOrder),
      bracketIndex(assets, assetsOrder),
      bracketIndex(employees, employeesOrder)
    );

    if (ngerReporter || superAumOver5b) {
      sizeScore = Math.max(sizeScore, 3); // escalate to highest tier
      if (ngerReporter) reasoning.push('NGER reporter.');
      if (superAumOver5b) reasoning.push('Super fund/financial institution with AUM > $5B.');
    }

    let classificationGroup: 1 | 2 | 3 = 3;
    if (sizeScore >= 3) classificationGroup = 1;
    else if (sizeScore === 2) classificationGroup = 2;
    else classificationGroup = 3;

    const mandatoryStartDate = classificationGroup === 1
      ? '2025-01-01'
      : classificationGroup === 2
        ? '2026-07-01'
        : '2027-07-01';

    reasoning.push(`Meets in-scope conditions (${sizeThresholdsMet} size thresholds met${ngerReporter ? ', NGER' : ''}${superAumOver5b ? ', AUM>5B' : ''}).`);
    reasoning.push(`Assigned Group ${classificationGroup}.`);

    return {
      inScope: true,
      classificationGroup,
      mandatoryStartDate,
      reasoning,
    };
  };

  const allQuestionsAnswered = questions.every(q => q.optional ? true : !!answers[q.id]);

  // Calculate assessment result when all classification questions are answered
  useEffect(() => {
    const classificationQuestions = [
      'entity-type', 'chapter-2m', 'revenue-2025', 'assets-2025', 'employees-2025', 'nger-reporter', 'aum-over-5b'
    ];
    const allClassificationAnswered = classificationQuestions.every(q => answers[q]);

    if (allClassificationAnswered) {
      const result = assessEligibility();
      setAssessmentResult(result);

      // Persist classification for use across the app
      storage.saveClassification({
        group: result.inScope ? (result.classificationGroup as 1 | 2 | 3) : 'not-required',
        reportingStart: result.mandatoryStartDate,
        assuranceRequired: false,
        reasoning: result.reasoning,
        inScope: result.inScope,
      } as any);
    }
  }, [answers]);

  const handleContinue = () => {
    if (allQuestionsAnswered) {
      console.log("Assessment answers:", answers);
      console.log("Assessment result:", assessmentResult);
      navigate('/questionnaire');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center">
            <Building className="w-8 h-8 text-white" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Classification Information</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Determine if your entity must comply with AASB S2 and identify your reporting requirements
          </p>
        </div>
      </div>

      {/* Progress */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Step 1 of 4</span>
            <span className="font-medium text-foreground">Classification Information</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-gradient-primary h-2 rounded-full transition-all duration-300" style={{ width: '40%' }}></div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((question, index) => (
          <Card key={question.id} className="shadow-card">
            <CardHeader>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="min-w-8 h-8 rounded-full flex items-center justify-center">
                  {index + 1}
                </Badge>
                <div className="flex-1">
                  <CardTitle className="text-lg">{question.question}</CardTitle>
                  <CardDescription className="mt-1">{question.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {question.type === "text" && (
                <Input
                  value={answers[question.id] || ""}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  placeholder="Enter your answer"
                  className="w-full"
                />
              )}
              {question.type === "select" && (
                <select
                  value={answers[question.id] || ""}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select an option</option>
                  {question.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              {question.type === "radio" && (
                <RadioGroup
                  value={answers[question.id] || ""}
                  onValueChange={(value) => handleAnswerChange(question.id, value)}
                >
                  {question.options?.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} />
                      <Label htmlFor={`${question.id}-${option.value}`} className="flex-1 cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Assessment Summary */}
      {assessmentResult && (
        <Card className="shadow-card border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <FileText className="w-5 h-5" />
              Assessment Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={assessmentResult.inScope ? "default" : "secondary"}>
                    {assessmentResult.inScope ? "AASB S2 Applies" : "Out of mandatory scope (Voluntary only)"}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Group Classification:</span>
                  <Badge variant="outline">
                    {assessmentResult.inScope ? `Group ${assessmentResult.classificationGroup}` : 'Voluntary only'}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Mandatory reporting start date:</span>
                  <span className="text-sm">{assessmentResult.mandatoryStartDate || '—'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-blue-900">Reasoning:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  {assessmentResult.reasoning.map((reason, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-6">
        <Button variant="outline" onClick={() => navigate('/profile')}>
          Back to Profile
        </Button>
        
        <Button 
          variant="sustainability" 
          size="lg"
          disabled={!allQuestionsAnswered}
          onClick={handleContinue}
          className="px-8"
        >
          Continue to Questionnaire
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}