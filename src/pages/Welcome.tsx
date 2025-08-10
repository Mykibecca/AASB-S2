import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, ArrowRight, FileCheck, ClipboardList, BarChart3, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const navigate = useNavigate();


  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-6 py-12">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-sustainability rounded-2xl flex items-center justify-center shadow-elevated">
            <Leaf className="w-12 h-12 text-white" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
            AASB S2 Disclosure Made Simple
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
           Use this platform as your starter point to guide you through AASB S2 compliance step-by-step.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
          <Button 
            variant="sustainability" 
            size="lg" 
            className="text-lg px-8 py-3"
            onClick={() => navigate('/readiness')}
          >
            Start Your Assessment
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Process Overview */}
      <Card className="shadow-card bg-gradient-subtle">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Simple 4-Step Process</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { title: "Classification Information", icon: FileCheck },
              { title: "Disclosure Questions", icon: ClipboardList },
              { title: "Progress Dashboard", icon: BarChart3 },
              { title: "Export & Share", icon: Download },
            ].map((step, index) => (
              <div key={index} className="text-center space-y-2">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto">
                  <step.icon className="w-5 h-5" />
                </div>
                <p className="text-xs text-muted-foreground">{`Step ${index + 1}`}</p>
                <p className="text-sm font-medium text-foreground">{step.title}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}