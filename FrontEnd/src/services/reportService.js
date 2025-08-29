import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from './api';
import { toast } from 'react-toastify';

/**
 * Generate a PDF report for a poll
 * @param {string} pollId - The ID of the poll to generate a report for
 */
export const exportPollReport = async (pollId) => {
  try {
    // Fetch the poll data
    const response = await api.get(`/api/polls/${pollId}/onepoll`);
    const poll = response.data;
    
    // Create new PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Add report header
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80);
    doc.text('Nestleo Poll Results Report', pageWidth / 2, 20, { align: 'center' });
    
    // Add poll information
    doc.setFontSize(14);
    doc.text(`Poll: ${poll.title}`, 14, 35);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    if (poll.description) {
      doc.text(`Description: ${poll.description}`, 14, 42);
    }
    
    // Format date
    const createdDate = poll.createdAt ? new Date(poll.createdAt).toLocaleDateString() : 'N/A';
    const completedDate = poll.endedAt ? new Date(poll.endedAt).toLocaleDateString() : 'N/A';
    doc.text(`Created: ${createdDate}`, 14, 49);
    doc.text(`Completed: ${completedDate}`, 14, 56);
    
    // Add statistics
    doc.setFontSize(13);
    doc.setTextColor(44, 62, 80);
    doc.text('Poll Statistics', 14, 68);
    
    const totalVotes = poll.responses ? poll.responses.length : 0;
    const uniqueVoters = poll.responses ? new Set(poll.responses.map(r => {
      return typeof r.user === 'object' ? r.user._id : r.user;
    })).size : 0;
    
    doc.setFontSize(11);
    doc.text(`Total Responses: ${totalVotes}`, 14, 75);
    doc.text(`Unique Voters: ${uniqueVoters}`, 14, 82);
    
    // Add poll results
    doc.setFontSize(13);
    doc.setTextColor(44, 62, 80);
    doc.text('Results by Question', 14, 95);
    
    let yPos = 105;
    
    // Handle multi-question polls
    if (poll.questions && poll.questions.length > 0) {
      for (let qIndex = 0; qIndex < poll.questions.length; qIndex++) {
        const question = poll.questions[qIndex];
        
        // Check if we need a new page
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.setTextColor(44, 62, 80);
        doc.text(`Question ${qIndex + 1}: ${question.title}`, 14, yPos);
        yPos += 8;
        
        // Create table data for options
        const totalQuestionVotes = question.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
        
        const tableData = [];
        question.options.forEach(option => {
          const votes = option.votes || 0;
          const percentage = totalQuestionVotes === 0 ? 0 : Math.round((votes / totalQuestionVotes) * 100);
          tableData.push([option.text, votes, `${percentage}%`]);
        });
        
        // Add table - using the correct autoTable method
        autoTable(doc, {
          startY: yPos,
          head: [['Option', 'Votes', 'Percentage']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [79, 129, 189], textColor: 255 },
          styles: { fontSize: 10 },
          margin: { left: 14, right: 14 }
        });
        
        yPos = doc.lastAutoTable.finalY + 15;
      }
    } 
    // Handle single question polls
    else if (poll.options && poll.options.length > 0) {
      doc.setFontSize(12);
      doc.text(`Question: ${poll.title}`, 14, yPos);
      yPos += 8;
      
      // Create table data for options
      const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
      
      const tableData = [];
      poll.options.forEach(option => {
        const votes = option.votes || 0;
        const percentage = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
        tableData.push([option.text, votes, `${percentage}%`]);
      });
      
      // Add table - using the correct autoTable method
      autoTable(doc, {
        startY: yPos,
        head: [['Option', 'Votes', 'Percentage']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [79, 129, 189], textColor: 255 },
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 }
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
    }
    
    // Add footer
    const today = new Date().toLocaleDateString();
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Report generated on ${today}`, pageWidth / 2, 285, { align: 'center' });
    
    // Save the PDF
    doc.save(`Poll_Report_${poll.title.replace(/\s+/g, '_')}.pdf`);
    
    toast.success('PDF report generated successfully');
    return true;
  } catch (error) {
    console.error('Error generating poll report:', error);
    toast.error('Failed to generate PDF report: ' + error.message);
    return false;
  }
};

/**
 * Export poll results as CSV
 * @param {Object} poll - The poll to export
 */
export const exportPollResults = (poll) => {
  if (!poll) return false;
  
  try {
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Add header
    csvContent += 'Poll: ' + poll.title + '\r\n';
    if (poll.description) {
      csvContent += 'Description: ' + poll.description + '\r\n';
    }
    csvContent += '\r\n';
    
    // Handle multi-question polls
    if (poll.questions && poll.questions.length > 0) {
      for (let qIndex = 0; qIndex < poll.questions.length; qIndex++) {
        const question = poll.questions[qIndex];
        csvContent += 'Question ' + (qIndex + 1) + ': ' + question.title + '\r\n';
        csvContent += 'Option,Votes,Percentage\r\n';
        
        const totalVotes = question.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
        
        question.options.forEach(option => {
          const votes = option.votes || 0;
          const percentage = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
          csvContent += `"${option.text}",${votes},${percentage}%\r\n`;
        });
        
        csvContent += '\r\n';
      }
    } 
    // Handle single question polls
    else if (poll.options && poll.options.length > 0) {
      csvContent += 'Question: ' + poll.title + '\r\n';
      csvContent += 'Option,Votes,Percentage\r\n';
      
      const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
      
      poll.options.forEach(option => {
        const votes = option.votes || 0;
        const percentage = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
        csvContent += `"${option.text}",${votes},${percentage}%\r\n`;
      });
    }
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Poll_Results_${poll.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    document.body.removeChild(link);
    
    toast.success('CSV file downloaded successfully');
    return true;
  } catch (error) {
    console.error('Error exporting poll results:', error);
    toast.error('Failed to export CSV');
    return false;
  }
};

export default {
  exportPollReport,
  exportPollResults
};