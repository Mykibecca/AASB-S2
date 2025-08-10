import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building2 } from "lucide-react";
import { scoreAnswers, ApplicabilityProfile } from "@/lib/logicEngine";
import { storage } from "@/lib/storage";
// Removed charts

export default function ReadinessDashboard() {
  const [answers, setAnswers] = useState<Record<string, any>>(() => storage.getQuestionnaire());
  const [profile, setProfile] = useState<ApplicabilityProfile | null>(null);

  // Real-time updates: listen to local changes and storage events
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'questionnaireAnswers') {
        setAnswers(storage.getQuestionnaire());
      }
    };
    const onLocal = () => setAnswers(storage.getQuestionnaire());
    window.addEventListener('storage', onStorage);
    window.addEventListener('questionnaire:updated', onLocal as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('questionnaire:updated', onLocal as EventListener);
    };
  }, []);

  useEffect(() => {
    const classification = storage.getClassification();
    if (classification) {
      const entityGroup = (classification.group === 'not-required' ? 'voluntary' : classification.group) as ApplicabilityProfile["entityGroup"];
      const assuranceProfile = {
        governance: classification.assuranceRequired ? 'limited' : 'none',
        strategy: 'none',
        risk: 'none',
        metrics: classification.assuranceRequired ? 'limited' : 'none',
      } as ApplicabilityProfile["assuranceProfile"];
      setProfile({ entityGroup, firstReportingFY: classification.reportingStart || '', assuranceProfile });
    }
  }, []);

  const scoring = useMemo(() => profile ? scoreAnswers(answers, profile) : null, [answers, profile]);
  // No chart data needed

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Readiness Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-primary" />
            <div>
              <div className="text-sm text-muted-foreground">Group classification</div>
              <div className="text-base font-medium">
                {profile ? (profile.entityGroup === 'voluntary' ? 'Voluntary only' : `Group ${profile.entityGroup}`) : '—'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <div className="text-sm text-muted-foreground">Mandatory reporting start date</div>
              <div className="text-base font-medium">{profile?.firstReportingFY || '—'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5" />
            <div>
              <div className="text-sm text-muted-foreground">Overall readiness</div>
              <div className="text-base font-medium">{scoring?.readiness ?? '—'}</div>
            </div>
          </div>
        </div>

        {/* Gaps by priority (ensures consistency with tables below) */}
        {scoring && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">{scoring.gapGroups.High.length}</div>
              <div className="text-sm text-red-700">High Priority Gaps</div>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-2xl font-bold text-amber-600">{scoring.gapGroups.Medium.length}</div>
              <div className="text-sm text-amber-700">Medium Priority Gaps</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">{scoring.gapGroups.Low.length}</div>
              <div className="text-sm text-green-700">Low Priority Gaps</div>
            </div>
          </div>
        )}

        {/* Detailed Gaps by Priority */}
        {scoring && (
          <div className="space-y-4">
            {(["High","Medium","Low"] as const).map((level) => (
              <div key={level} className="border rounded-lg">
                <div className={`px-4 py-2 font-semibold flex items-center justify-between ${level === 'High' ? 'bg-red-50 text-red-800 border-b border-red-200' : level === 'Medium' ? 'bg-amber-50 text-amber-800 border-b border-amber-200' : 'bg-green-50 text-green-800 border-b border-green-200'}`}>
                  <span>{level} Priority Gaps</span>
                  <Badge variant={level === 'High' ? 'destructive' : level === 'Medium' ? 'default' : 'secondary'}>
                    {scoring.gapGroups[level].length}
                  </Badge>
                </div>
                {scoring.gapGroups[level].length > 0 ? (
                  <ul className="divide-y">
                    {scoring.gapGroups[level].map(gap => (
                      <li key={gap.id} className="px-4 py-3 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{gap.clause}: {gap.question}</div>
                          <div className="flex items-center gap-2">
                            <Badge variant={gap.urgency === 'High' ? 'destructive' : gap.urgency === 'Medium' ? 'default' : 'secondary'}>{gap.urgency}</Badge>
                          </div>
                        </div>
                        {gap.gapDescription && (
                          <div className="text-muted-foreground mt-1"><span className="font-medium">Gap:</span> {gap.gapDescription}</div>
                        )}
                        {gap.recommendation && (
                          <div className="text-muted-foreground mt-1"><span className="font-medium">Recommendation:</span> {gap.recommendation}</div>
                        )}
                        {gap.relevantClause && (
                          <div className="text-muted-foreground mt-1"><span className="font-medium">AASB S2 Clause:</span> {gap.relevantClause}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-3 text-sm text-muted-foreground">No {level.toLowerCase()} priority gaps identified.</div>
                )}
              </div>
            ))}
          </div>
        )}

        <h3 className="text-lg font-semibold">Section overview</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(scoring?.sectionScores || []).map(s => {
            const sectionGaps = (scoring?.gapsDetailed || []).filter(g => g.section === s.sectionTitle);
            const high = sectionGaps.filter(g => g.priority === 'High').length;
            const medium = sectionGaps.filter(g => g.priority === 'Medium').length;
            const low = sectionGaps.filter(g => g.priority === 'Low').length;
            const total = sectionGaps.length;
            return (
              <Card key={s.sectionId}>
                <CardHeader>
                  <CardTitle className="text-base">{s.sectionTitle}</CardTitle>
                  <CardDescription>
                    <span className="text-2xl font-bold mr-2">{total}</span>
                    <span className="text-muted-foreground">Total gaps</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded bg-red-50 border border-red-200">
                      <div className="text-xl font-semibold text-red-700">{high}</div>
                      <div className="text-xs text-red-800">High</div>
                    </div>
                    <div className="p-2 rounded bg-amber-50 border border-amber-200">
                      <div className="text-xl font-semibold text-amber-700">{medium}</div>
                      <div className="text-xs text-amber-800">Medium</div>
                    </div>
                    <div className="p-2 rounded bg-green-50 border border-green-200">
                      <div className="text-xl font-semibold text-green-700">{low}</div>
                      <div className="text-xs text-green-800">Low</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}


