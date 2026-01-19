import React from 'react';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { LayoutGrid, FileText, Vault, Users, ShieldCheck, Settings } from 'lucide-react';

export default function GovernanceDashboard({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'proposals', label: 'Proposals', icon: FileText },
    { id: 'treasury', label: 'Treasury', icon: Vault },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'audit', label: 'Audit', icon: ShieldCheck },
    { id: 'operations', label: 'Operations', icon: Settings },
  ];

  return (
    <div className="border-y-4 border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="brutal-card bg-card p-2 grid grid-cols-6 gap-2 h-auto">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="brutal-card data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold py-3 px-6 transition-all hover:translate-x-0.5 hover:translate-y-0.5"
              >
                <tab.icon className="w-5 h-5 mr-2" strokeWidth={2.5} />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}