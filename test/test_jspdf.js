import { jsPDF } from 'jspdf';

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

doc.setFont('helvetica', 'bold');
doc.setFontSize(16);
doc.text('TEST PLOT NAKSHA', 20, 20);

const pdfOutput = doc.output('datauristring');
console.log('jsPDF successfully created PDF, length:', pdfOutput.length);
