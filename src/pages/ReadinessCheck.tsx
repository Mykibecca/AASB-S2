import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle, ArrowRight, Info, Building, AlertTriangle, FileText, Calendar, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { storage } from "@/lib/storage";

interface AssessmentResult {
  applies: boolean;
  group: number | 'exempt';
  reportingStartDate: string;
  assuranceLevel: 'limited' | 'reasonable' | 'none';
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
      id: "esg-maturity",
      question: "ESG Maturity Level (Optional)",
      description: "Select your organization's ESG maturity level",
      type: "select",
      optional: true,
      options: [
        { value: "basic", label: "Basic (New to ESG reporting)" },
        { value: "moderate", label: "Moderate (Some ESG experience)" },
        { value: "advanced", label: "Advanced (Established ESG practices)" }
      ]
    },
    {
      id: "revenue",
      question: "What is the total consolidated revenue of the reporting entity for the last financial year?",
      description: "This helps determine size thresholds for mandatory disclosure.",
      type: "radio",
      options: [
        { value: "less-than-50m", label: "Less than $50 million" },
        { value: "50m-to-200m", label: "$50 million to $200 million" },
        { value: "more-than-200m", label: "More than $200 million" }
      ]
    },
    {
      id: "assets",
      question: "What is the total consolidated gross assets of the reporting entity?",
      description: "Used for group classification thresholds.",
      type: "radio",
      options: [
        { value: "less-than-25m", label: "Less than $25 million" },
        { value: "25m-to-500m", label: "$25 million to $500 million" },
        { value: "more-than-500m", label: "More than $500 million" }
      ]
    },
    {
      id: "employees",
      question: "How many employees does the reporting entity and its controlled entities have in total?",
      description: "Headcount is a key determinant for AASB S2 group thresholds.",
      type: "radio",
      options: [
        { value: "fewer-than-100", label: "Fewer than 100" },
        { value: "100-to-499", label: "100 to 499" },
        { value: "500-or-more", label: "500 or more" }
      ]
    },
    {
      id: "corporate-structure",
      question: "What best describes the reporting entity's corporate structure or status?",
      description: "This helps determine if the entity is required to report under the Corporations Act obligations",
      type: "radio",
      options: [
        { value: "asx-listed", label: "Listed on a public exchange (e.g. ASX)" },
        { value: "large-proprietary", label: "Registered with ASIC as a large proprietary company" },
        { value: "other", label: "Other (e.g. trust, partnership, small private company)" },
        { value: "unsure", label: "Unsure" }
      ]
    }
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
    let applies = false;
    let group: number | 'exempt' = 'exempt';
    let reportingStartDate = '';
    let assuranceLevel: 'limited' | 'reasonable' | 'none' = 'none';

    // Determine group based on size and corporate structure
    const revenue = answers['revenue'];
    const assets = answers['assets'];
    const employees = answers['employees'];
    const corporateStructure = answers['corporate-structure'];

    // Group 1 criteria (ASX-listed entities with market cap > $500m)
    if (corporateStructure === 'asx-listed' && 
        (revenue === 'more-than-200m' || assets === 'more-than-500m')) {
      group = 1;
      reportingStartDate = 'FY2024/25';
      assuranceLevel = 'limited';
      applies = true;
      reasoning.push("ASX-listed entity with significant size thresholds");
      reasoning.push("Falls under Group 1 - earliest reporting requirement");
    }
    // Group 2 criteria (ASX-listed entities with market cap $100m-$500m)
    else if (corporateStructure === 'asx-listed' && 
             (revenue === '50m-to-200m' || assets === '25m-to-500m')) {
      group = 2;
      reportingStartDate = 'FY2026/27';
      assuranceLevel = 'limited';
      applies = true;
      reasoning.push("ASX-listed entity with moderate size thresholds");
      reasoning.push("Falls under Group 2 - reporting from FY2026/27");
    }
    // Group 3 criteria (Large proprietary companies and other entities)
    else if (corporateStructure === 'large-proprietary' || 
             (corporateStructure === 'asx-listed' && 
              (revenue === 'less-than-50m' || assets === 'less-than-25m'))) {
      group = 3;
      reportingStartDate = 'FY2027/28';
      assuranceLevel = 'limited';
      applies = true;
      reasoning.push("Large proprietary company or smaller ASX-listed entity");
      reasoning.push("Falls under Group 3 - reporting from FY2027/28");
    }
    // Other entities with significant size
    else if (revenue === 'more-than-200m' || assets === 'more-than-500m' || employees === '500-or-more') {
      group = 3;
      reportingStartDate = 'FY2027/28';
      assuranceLevel = 'limited';
      applies = true;
      reasoning.push("Significant size thresholds met");
      reasoning.push("Falls under Group 3 - reporting from FY2027/28");
    }
    // Exempt
    else {
      reasoning.push("Entity does not meet mandatory disclosure thresholds");
    }

    return {
      applies,
      group,
      reportingStartDate,
      assuranceLevel,
      reasoning
    };
  };

  const allQuestionsAnswered = questions.every(q => 
    q.optional ? true : answers[q.id]
  );

  // Calculate assessment result when all classification questions are answered
  useEffect(() => {
    const classificationQuestions = ['revenue', 'assets', 'employees', 'corporate-structure'];
    const allClassificationAnswered = classificationQuestions.every(q => answers[q]);
    
    if (allClassificationAnswered) {
      const result = assessEligibility();
      setAssessmentResult(result);
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
                  <Badge variant={assessmentResult.applies ? "default" : "secondary"}>
                    {assessmentResult.applies ? "AASB S2 Applies" : "AASB S2 Does Not Apply"}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Group Classification:</span>
                  <Badge variant="outline">
                    {assessmentResult.group === 'exempt' ? 'Exempt' : `Group ${assessmentResult.group}`}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Reporting Start Date:</span>
                  <span className="text-sm">{assessmentResult.reportingStartDate}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Assurance Level:</span>
                  <Badge variant="outline" className="capitalize">
                    {assessmentResult.assuranceLevel === 'none' ? 'None required' : `${assessmentResult.assuranceLevel} assurance`}
                  </Badge>
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