import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Download, FileText, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { storage } from "@/lib/storage";

export default function Export() {
  const navigate = useNavigate();
  const [selectedSections, setSelectedSections] = useState<string[]>([
    "company-profile", 
    "responses",
    "gaps-analysis",
    "appendices"
  ]);
  // Sharing removed

  // Company/classification data
  const [company, setCompany] = useState<any>(() => storage.getCompanyProfile() || {});
  const [classification, setClassification] = useState<any>(() => storage.getClassification());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'companyProfileData' || e.key === 'classificationResult') {
        setCompany(storage.getCompanyProfile() || {});
        setClassification(storage.getClassification());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const formatGroup = (g: any) => {
    if (!g && g !== 0) return 'N/A';
    if (g === 'not-required') return 'Not Required';
    return `Group ${g}`;
  };

  const exportSections = [
    { id: "company-profile", name: "Company Profile", description: "Organization details and context" },
    { id: "responses", name: "Question Responses", description: "Detailed answers by question" },
    { id: "gaps-analysis", name: "Gaps Analysis", description: "Identified areas for improvement" },
    { id: "appendices", name: "Appendices", description: "Supporting documentation and references" }
  ];

  const handleSectionToggle = (sectionId: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleExport = async () => {
    try {
      const origin = window.location.origin;
      const resp = await fetch('http://localhost:8787/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: selectedSections,
          company,
          classification,
          answers: storage.getQuestionnaire(),
          origin
        })
      });
      if (!resp.ok) throw new Error('Failed to generate PDF');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AASB_S2_Readiness_Report_${new Date().toISOString().slice(0,10)}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error(e);
    }
  };

  // Share actions removed

  // PDF composition handled by export server

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center">
            <Download className="w-8 h-8 text-white" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Export & Share</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Download your AASB S2 disclosure report or share with stakeholders
          </p>
        </div>
      </div>

      {/* Progress */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Step 4 of 4</span>
            <span className="font-medium text-foreground">Export & Share</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-gradient-primary h-2 rounded-full transition-all duration-300" style={{ width: '83%' }}></div>
          </div>
        </CardContent>
      </Card>

      {/* Report Summary */}
      <Card className="shadow-card bg-gradient-subtle">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            Report Ready
          </CardTitle>
          <CardDescription>
            Your AASB S2 climate disclosure assessment is complete and ready for export
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            {[
              { label: 'Company', value: company?.companyName || 'N/A' },
              { label: 'Industry', value: company?.industry || 'N/A' },
              { label: 'Size', value: company?.size || 'N/A' },
              { label: 'ASX Listed', value: company?.asxListed || 'N/A' },
              { label: 'RSE Status', value: company?.rseStatus || 'N/A' },
              { label: 'NGER Reporter', value: company?.ngerReporter || 'N/A' },
              { label: 'NGER Emissions', value: company?.ngerEmissions || 'N/A' },
              { label: 'Consolidated Revenue', value: company?.consolidatedRevenue || 'N/A' },
              { label: 'Gross Assets', value: company?.grossAssets || 'N/A' },
              { label: 'Employees', value: company?.employees || 'N/A' },
              { label: 'AASB S2 Group', value: formatGroup(classification?.group) },
              { label: 'Reporting Start', value: classification?.reportingStart || 'N/A' },
              { label: 'Assurance', value: classification ? (classification.assuranceRequired ? 'Required' : 'Not Required') : 'N/A' },
              { label: 'Generated', value: new Date().toLocaleDateString() }
            ].map((item, idx) => (
              <div key={idx}>
                <span className="text-muted-foreground">{item.label}:</span>
                <p className="font-medium break-words">{item.value}</p>
            </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6">
        {/* Export Configuration */}
        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Export Report
            </CardTitle>
            <CardDescription>
              Customize and download your disclosure report
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Format Selection (PDF only) */}
            <div className="space-y-1">
              <Label>Export Format</Label>
              <div className="text-sm text-muted-foreground">PDF</div>
            </div>

            <Separator />

            {/* Section Selection */}
            <div className="space-y-3">
              <Label>Include Sections</Label>
              <div className="space-y-3">
                {exportSections.map((section) => (
                  <div key={section.id} className="flex items-start space-x-3">
                    <Checkbox
                      id={section.id}
                      checked={selectedSections.includes(section.id)}
                      onCheckedChange={() => handleSectionToggle(section.id)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label 
                        htmlFor={section.id}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {section.name}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {section.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              variant="sustainability" 
              className="w-full"
              onClick={handleExport}
              disabled={selectedSections.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Report ({selectedSections.length} sections)
            </Button>
          </CardContent>
        </Card>
      </div>

      

      {/* Next Steps */}
      <Card className="shadow-card bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-green-900">Assessment Complete!</h4>
              <p className="text-sm text-green-800">
                Congratulations! You've completed your AASB S2 climate disclosure assessment. 
                Your report is ready to download and share with stakeholders.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between items-center pt-6">
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
        
        <div className="flex gap-3">
          <Button variant="outline">
            Save Progress
          </Button>
          <Button 
            variant="sustainability" 
            size="lg"
            onClick={() => navigate('/')}
            className="px-8"
          >
            Start New Assessment
          </Button>
        </div>
      </div>
    </div>
  );
}