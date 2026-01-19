import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { toast } from 'sonner';
import { FileText, Send } from 'lucide-react';

export default function CreateProposalDialog({ open, onOpenChange }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    amount: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.category) {
      toast.error('Missing Fields', {
        description: 'Please fill in all required fields'
      });
      return;
    }

    // Simulate proposal creation
    toast.success('Proposal Created!', {
      description: 'Your proposal has been submitted for voting'
    });
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      category: '',
      amount: '',
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="brutal-card max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" strokeWidth={3} />
            Create New Proposal
          </DialogTitle>
          <DialogDescription className="text-base font-semibold">
            Submit a proposal to the DAO for community voting. All proposals require a quorum of 10,000 votes to pass.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-bold">Proposal Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Increase Treasury Allocation for Development"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="brutal-card font-semibold"
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-bold">Category *</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger className="brutal-card font-semibold">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="brutal-card">
                <SelectItem value="treasury">Treasury Spending</SelectItem>
                <SelectItem value="protocol">Protocol Upgrade</SelectItem>
                <SelectItem value="membership">Membership Change</SelectItem>
                <SelectItem value="governance">Governance Change</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount (if Treasury) */}
          {formData.category === 'treasury' && (
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-bold">Amount (ETH)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="e.g., 100"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="brutal-card font-semibold"
              />
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-bold">Description *</Label>
            <Textarea
              id="description"
              placeholder="Provide a detailed description of your proposal, including rationale, expected outcomes, and implementation plan..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="brutal-card font-semibold min-h-[150px]"
              required
            />
          </div>

          {/* Info Box */}
          <div className="brutal-card bg-primary/10 p-4">
            <h4 className="font-bold mb-2">Proposal Guidelines</h4>
            <ul className="text-sm text-muted-foreground space-y-1 font-semibold">
              <li>• Proposals require 10,000 votes to meet quorum</li>
              <li>• Voting period is 7 days from submission</li>
              <li>• Simple majority (>50%) needed to pass</li>
              <li>• Executed proposals have a 24h timelock</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="brutal-card font-bold flex-1 transition-all hover:translate-x-0.5 hover:translate-y-0.5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="brutal-card bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex-1 transition-all hover:translate-x-0.5 hover:translate-y-0.5"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Proposal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}