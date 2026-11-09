import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Upload, FileText, CheckCircle, AlertCircle, XCircle, 
  ArrowRight, Database, History, Download, RefreshCw 
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import importService from '../services/importService';
import { Badge } from '../components/ui/badge';

export function AdminUploadPanel() {
  const [step, setStep] = useState('upload'); // upload, results, history
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState(null); // batchId, totalRows, preview
  const [importHistory, setImportHistory] = useState([]);
  const [isRefreshingHistory, setIsRefreshingHistory] = useState(false);

  useEffect(() => {
    if (step === 'history') {
      fetchHistory();
    }
  }, [step]);

  const fetchHistory = async () => {
    setIsRefreshingHistory(true);
    try {
      const data = await importService.getImportHistory();
      setImportHistory(data);
    } catch (error) {
      toast.error('Failed to load import history');
    } finally {
      setIsRefreshingHistory(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx')) {
        toast.error('Please upload a .csv or .xlsx file');
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error('File size exceeds the 5MB limit. Please upload a smaller file.');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const result = await importService.uploadFile(file);
      setUploadResult(result);
      setStep('results');
      toast.success('File parsed successfully. Please review the validation summary.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!uploadResult?.batchId) return;

    setIsProcessing(true);
    try {
      const result = await importService.confirmImport(uploadResult.batchId);
      toast.success(`Success! Imported ${result.successCount} student records.`);
      setStep('history');
      setFile(null);
      setUploadResult(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Final import failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const validRows = uploadResult?.preview?.filter(r => r.status === 'valid') || [];
  const invalidRows = uploadResult?.preview?.filter(r => r.status === 'invalid') || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Step Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant={step === 'upload' ? 'default' : 'outline'} 
            onClick={() => setStep('upload')}
            className={step === 'upload' ? 'bg-indigo-600' : ''}
          >
            <Upload className="w-4 h-4 mr-2" /> Upload
          </Button>
          <Button 
            variant={step === 'history' ? 'default' : 'outline'} 
            onClick={() => setStep('history')}
            className={step === 'history' ? 'bg-indigo-600' : ''}
          >
            <History className="w-4 h-4 mr-2" /> History
          </Button>
        </div>
        
        {step === 'upload' && (
           <Button variant="ghost" className="text-indigo-600" onClick={() => window.open('/student_import_template.csv')}>
             <Download className="w-4 h-4 mr-2" /> Download Template
           </Button>
        )}
      </div>

      {step === 'upload' && (
        <Card className="border-2 border-indigo-100 shadow-xl overflow-hidden">
          <CardHeader className="bg-indigo-50 border-b border-indigo-100 pb-8">
            <CardTitle className="text-2xl text-indigo-900">Student Data Import</CardTitle>
            {/* <p className="text-indigo-700">Upload your master spreadsheet to sync student records across all database tables.</p> */}
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="border-2 border-dashed border-indigo-200 rounded-2xl bg-white p-16 text-center hover:border-indigo-400 transition-all cursor-pointer group">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileChange}
                accept=".csv,.xlsx"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Upload className="w-10 h-10 text-indigo-600" />
                </div>
                {file ? (
                  <div className="space-y-2">
                    <p className="text-xl font-bold text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xl font-bold text-gray-900">Choose a file to start</p>
                    <p className="text-sm text-gray-500">Support .csv and .xlsx (Max 5MB)</p>
                  </div>
                )}
              </label>
            </div>

            <div className="flex justify-center">
              <Button 
                onClick={handleUpload} 
                disabled={!file || isProcessing}
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-14 px-12 rounded-xl shadow-lg shadow-indigo-200 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-3 animate-spin" /> Analyzing File...
                  </>
                ) : (
                  <>
                    Analyze and Pre-validate <ArrowRight className="ml-3 w-5 h-5" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'results' && uploadResult && (
        <div className="space-y-6 animate-in fade-in duration-500">
           {/* Summary Cards */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-white border-l-4 border-l-gray-400">
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-gray-500">Total Rows Detected</p>
                  <p className="text-3xl font-bold text-gray-900">{uploadResult.totalRows}</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-l-4 border-l-green-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-green-600">Valid Records</p>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-green-700">{validRows.length}</p>
                  <p className="text-xs text-green-600 mt-1">Ready to sync</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-l-4 border-l-red-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-red-600">Invalid Records</p>
                    <XCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <p className="text-3xl font-bold text-red-700">{invalidRows.length}</p>
                  <p className="text-xs text-red-600 mt-1">Will be skipped</p>
                </CardContent>
              </Card>
           </div>

           {/* Invalid Rows Alert */}
           {invalidRows.length > 0 && (
             <Card className="border-red-200 bg-red-50/50">
               <CardHeader className="flex flex-row items-center gap-2 pb-2">
                 <AlertCircle className="w-5 h-5 text-red-600" />
                 <CardTitle className="text-lg text-red-800">Errors Detected</CardTitle>
               </CardHeader>
               <CardContent>
                  <div className="border border-red-200 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-red-100">
                        <TableRow>
                          <TableHead className="text-red-900 w-20">Row #</TableHead>
                          <TableHead className="text-red-900">Enrollment No.</TableHead>
                          <TableHead className="text-red-900">Issue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invalidRows.slice(0, 10).map((row, idx) => (
                          <TableRow key={idx} className="bg-white">
                            <TableCell className="font-bold text-red-700">{row.row_number}</TableCell>
                            <TableCell className="font-medium">{row.enrollment_no || 'MISSING'}</TableCell>
                            <TableCell className="text-red-600">{row.error}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {invalidRows.length > 10 && (
                    <p className="text-xs text-red-500 mt-3 text-center">... and {invalidRows.length - 10} more invalid rows</p>
                  )}
               </CardContent>
             </Card>
           )}

           {/* Valid Preview Table */}
           <Card>
             <CardHeader className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-600" />
                    Data Preview (Showing Top 10 Valid Rows)
                  </CardTitle>
                  <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50">
                    Upsert Mode Enabled
                  </Badge>
                </div>
             </CardHeader>
             <CardContent className="p-0">
                <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-gray-50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="font-bold">Enrollment No.</TableHead>
                      <TableHead className="font-bold">Name</TableHead>
                      <TableHead className="font-bold">Course</TableHead>
                      <TableHead className="font-bold">Grad %</TableHead>
                      <TableHead className="font-bold">Placement Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validRows.length > 0 ? (
                       validRows.slice(0, 10).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs font-semibold">{row.enrollment_no}</TableCell>
                          <TableCell className="font-medium">{row.data['Student Name']}</TableCell>
                          <TableCell>{row.data['Course']}</TableCell>
                          <TableCell>{row.data['Graduation %'] || 'N/A'}%</TableCell>
                          <TableCell>
                            <Badge className={
                              row.data['Current Placement Status'] === 'Placed' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-700'
                            }>
                              {row.data['Current Placement Status'] || 'Unplaced'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-gray-500 italic">
                          No valid rows found in the uploaded file.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
             </CardContent>
           </Card>

           {/* Action Bar */}
           <div className="flex items-center justify-between pb-10">
              <Button variant="ghost" onClick={() => setStep('upload')} disabled={isProcessing}>
                Cancel and Start Over
              </Button>
              <Button 
                onClick={handleConfirmImport} 
                disabled={validRows.length === 0 || isProcessing}
                className="bg-green-600 hover:bg-green-700 text-white font-bold h-14 px-12 rounded-xl shadow-lg shadow-green-200"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-3 animate-spin" /> Syncing with DB...
                  </>
                ) : (
                  <>
                    Commit and Sync {validRows.length} Records <CheckCircle className="ml-3 w-5 h-5" />
                  </>
                )}
              </Button>
           </div>
        </div>
      )}

      {step === 'history' && (
        <Card className="animate-in fade-in duration-500">
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <CardTitle className="text-lg">Recent Import Activity</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchHistory} disabled={isRefreshingHistory}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshingHistory ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-bold">File Name</TableHead>
                  <TableHead className="font-bold text-center">Total Rows</TableHead>
                  <TableHead className="font-bold text-center">Success</TableHead>
                  <TableHead className="font-bold text-center">Failed</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importHistory.length > 0 ? (
                  importHistory.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" /> {log.file_name}
                      </TableCell>
                      <TableCell className="text-center font-bold">{log.total_rows}</TableCell>
                      <TableCell className="text-center text-green-600 font-bold">{log.success_rows}</TableCell>
                      <TableCell className="text-center text-red-600 font-bold">{log.failed_rows}</TableCell>
                      <TableCell>
                        <Badge className={
                          log.status === 'completed' ? 'bg-green-100 text-green-700' :
                          log.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }>
                          {log.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                   <TableRow>
                     <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                        No import history found.
                     </TableCell>
                   </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
