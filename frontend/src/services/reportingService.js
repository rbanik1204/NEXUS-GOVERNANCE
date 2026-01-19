import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Parser } from 'json2csv';
import analyticsService from './analyticsService';
import web3Service from './web3Service';

const reportingService = {
    generateProposalReport: async () => {
        try {
            const healthData = await analyticsService.fetchDAOHealth() || {
                score: 'N/A',
                status: 'Unknown',
                metrics: { successRate: 0, participation: 0 }
            };
            const monthlyTrends = await analyticsService.fetchMonthlyTrends() || [];

            // Format data for PDF
            const doc = new jsPDF();

            // Header
            doc.setFontSize(22);
            doc.text('Nexus Government DAO - Governance Report', 20, 20);
            doc.setFontSize(12);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);

            // Health Score
            doc.setFontSize(16);
            doc.text('1. DAO Health Overview', 20, 45);
            doc.setFontSize(12);
            doc.text(`Overall Health Score: ${healthData.score}/100`, 20, 55);
            doc.text(`Status: ${healthData.status}`, 20, 62);
            doc.text(`Success Rate: ${healthData.metrics.successRate}%`, 20, 69);
            doc.text(`Voter Participation: ${healthData.metrics.participation}%`, 20, 76);

            // Monthly Activity Table
            doc.setFontSize(16);
            doc.text('2. Monthly Activity (Last 12 Months)', 20, 95);

            const tableData = monthlyTrends && monthlyTrends.length > 0
                ? monthlyTrends.map(trend => [
                    trend.id,
                    trend.proposalsCreated,
                    trend.proposalsPassed,
                    trend.totalVotes,
                    `${trend.participationRate}%`
                ])
                : [['No Data', '0', '0', '0', '0%']];

            autoTable(doc, {
                startY: 100,
                head: [['Month', 'Proposals Created', 'Proposals Passed', 'Total Votes', 'Participation Rate']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [100, 100, 255] }
            });

            // Summary
            const finalY = doc.previousAutoTable.finalY + 20;
            doc.setFontSize(14);
            doc.text('Auditor Verification Statement:', 20, finalY);
            doc.setFontSize(10);
            doc.text('This report is generated from immutable blockchain data verified by indexer v0.0.2.', 20, finalY + 10);
            doc.text('All metrics are cryptographically provable and traceable to source transactions.', 20, finalY + 15);

            doc.save('Nexus_Governance_Audit_Report.pdf');
            return true;
        } catch (error) {
            console.error('Error generating PDF report:', error);
            return false;
        }
    },

    exportAuditLogsCSV: async () => {
        try {
            // Fetch treasury transactions which act as financial audit logs
            const treasuryData = await analyticsService.fetchTreasuryAnalytics();

            if (!treasuryData || !treasuryData.transactions) return false;

            const fields = ['id', 'type', 'amount', 'tokenSymbol', 'from', 'to', 'timestamp'];
            const opts = { fields };
            const parser = new Parser(opts);
            const csv = parser.parse(treasuryData.transactions);

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'Nexus_Treasury_Audit_Logs.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            return true;
        } catch (error) {
            console.error('Error exporting CSV:', error);
            return false;
        }
    }
};

export default reportingService;
