import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, Shield, Calendar } from "lucide-react";
import { storage, UserData } from "@/lib/storage";
import ReadinessDashboard from "@/components/ReadinessDashboard";
import { scoreAnswers, ApplicabilityProfile } from "@/lib/logicEngine";

export default function Dashboard() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user data on component mount
  useEffect(() => {
    const loadUserData = () => {
      const data = storage.getAllUserData();
      setUserData(data);
      setLoading(false);
    };

    loadUserData();

    // Live updates when questionnaire or classification changes
    const onLocalUpdate = () => {
      const data = storage.getAllUserData();
      setUserData(data);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'questionnaireAnswers' || e.key === 'classificationResult') {
        onLocalUpdate();
      }
    };
    window.addEventListener('questionnaire:updated', onLocalUpdate as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('questionnaire:updated', onLocalUpdate as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Calculate progress metrics using logic engine visibility
  const calculateProgress = () => {
    if (!userData) return { overallProgress: 0, answeredQuestions: 0, gapsCount: 0 };
    const classification = userData.classification;
    if (!classification) return { overallProgress: 0, answeredQuestions: 0, gapsCount: 0 };
    const entityGroup = (classification.group === 'not-required' ? 'voluntary' : classification.group) as ApplicabilityProfile["entityGroup"];
    const profile: ApplicabilityProfile = { entityGroup, firstReportingFY: classification.reportingStart || '' };
    const scoring = scoreAnswers(userData.questionnaire as any, profile);
    const totalVisible = scoring.visibleQuestionIds.size;
    const answeredVisible = Array.from(scoring.visibleQuestionIds).filter(id => {
      const ans: any = (userData.questionnaire as any)?.[id];
      return ans && (ans.severity !== null && ans.severity !== undefined);
    }).length;
    const overallProgress = totalVisible > 0 ? Math.round((answeredVisible / totalVisible) * 100) : 0;
    // Use logic engine's gap computation for consistency
    const gapsCount = scoring.gapsDetailed.length;
    return { overallProgress, answeredQuestions: answeredVisible, gapsCount };
  };

  const { overallProgress, answeredQuestions, gapsCount } = calculateProgress();

  // Gaps analysis panel removed

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">AASB S2 Readiness Dashboard</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Track your Assessment progress and identify gaps in your climate disclosure readiness
          </p>
        </div>
      </div>

      {/* Progress Overview */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Assessment Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{overallProgress}%</div>
              <div className="text-sm text-muted-foreground">Overall Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{answeredQuestions}</div>
              <div className="text-sm text-muted-foreground">Questions Answered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{gapsCount}</div>
              <div className="text-sm text-muted-foreground">Gaps Identified</div>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={overallProgress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6">
        {/* Readiness Dashboard */}
        <div>
          <ReadinessDashboard />
        </div>
      </div>

      {/* AASB S2 Classification Summary */}
      {userData?.classification && (
        <Card className="shadow-card border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <Shield className="w-5 h-5" />
              AASB S2 Classification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={userData.classification.group !== 'not-required' ? "default" : "secondary"}>
                  {userData.classification.group === 'not-required' ? 'Not Required' : `Group ${userData.classification.group}`}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-600" />
                <span>Reporting Start: {userData.classification.reportingStart}</span>
              </div>
              
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}