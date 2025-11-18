import * as XLSX from 'xlsx';

export const exportService = {
  // Export leads to Excel
  exportLeadsToExcel: (leads, fileName = 'leads_export') => {
    try {
      // Prepare data for Excel - using only full name
      const excelData = leads.map(lead => ({
        'Full Name': lead.fullName || '',
        'Email': lead.email || '',
        'Phone Number': lead.mobileNo || lead.phone || '',
        'Property Type': lead.propertyType || '',
        'Budget': lead.budget ? `Rs. ${lead.budget.toLocaleString()}` : '',
        'Location': lead.location || '',
        'Source': lead.source || '',
        'Status': lead.status || '',
        'Assigned Agent': lead.assignedAgentEmail || '',
        'Created Date': formatFirestoreTimestamp(lead.createdAt),
        'Last Updated': formatFirestoreTimestamp(lead.lastModified || lead.updatedAt),
        'Notes': lead.notes || '',
        'Follow-ups Count': lead.followUps ? lead.followUps.length : 0,
        'Last Follow-up': lead.followUps && lead.followUps.length > 0 ? 
          formatFirestoreTimestamp(lead.followUps[lead.followUps.length - 1].date) : 'None'
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

      // Set column widths for better formatting
      const colWidths = [
        { wch: 20 }, // Full Name
        { wch: 25 }, // Email
        { wch: 15 }, // Phone Number
        { wch: 15 }, // Property Type
        { wch: 15 }, // Budget
        { wch: 15 }, // Location
        { wch: 12 }, // Source
        { wch: 12 }, // Status
        { wch: 20 }, // Assigned Agent
        { wch: 12 }, // Created Date
        { wch: 12 }, // Last Updated
        { wch: 30 }, // Notes
        { wch: 8 },  // Follow-ups Count
        { wch: 12 }  // Last Follow-up
      ];
      worksheet['!cols'] = colWidths;

      // Generate Excel file and trigger download
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('✅ Excel file exported successfully');
      return true;
    } catch (error) {
      console.error('❌ Error exporting to Excel:', error);
      throw new Error('Failed to export leads: ' + error.message);
    }
  },

  // Export leads to CSV
  exportLeadsToCSV: (leads, fileName = 'leads_export') => {
    try {
      // Prepare CSV headers
      const headers = [
        'Full Name', 'Email', 'Phone Number', 'Property Type', 'Budget', 
        'Location', 'Source', 'Status', 'Assigned Agent', 'Created Date', 
        'Last Updated', 'Notes', 'Follow-ups Count', 'Last Follow-up'
      ];

      // Prepare data rows using only full name
      const csvRows = leads.map(lead => [
        lead.fullName || '',
        lead.email || '',
        lead.mobileNo || lead.phone || '',
        lead.propertyType || '',
        lead.budget ? `Rs. ${lead.budget}` : '',
        lead.location || '',
        lead.source || '',
        lead.status || '',
        lead.assignedAgentEmail || '',
        formatFirestoreTimestamp(lead.createdAt),
        formatFirestoreTimestamp(lead.lastModified || lead.updatedAt),
        `"${(lead.notes || '').replace(/"/g, '""')}"`, // Escape quotes for CSV
        lead.followUps ? lead.followUps.length : 0,
        lead.followUps && lead.followUps.length > 0 ? 
          formatFirestoreTimestamp(lead.followUps[lead.followUps.length - 1].date) : 'None'
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('✅ CSV file exported successfully');
      return true;
    } catch (error) {
      console.error('❌ Error exporting to CSV:', error);
      throw new Error('Failed to export leads: ' + error.message);
    }
  }
};

// Helper function to format Firestore timestamps
const formatFirestoreTimestamp = (timestamp) => {
  if (!timestamp) return '';
  
  try {
    let date;
    if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }
    
    return date.toLocaleString();
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return '';
  }
};