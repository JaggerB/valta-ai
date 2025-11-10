// Configure PDF.js worker only on client side
if (typeof window !== 'undefined') {
  import('react-pdf').then((module) => {
    const { pdfjs } = module;
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
  });
}
