import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface ValidationError {
    row: number;
    teacher: string;
    subject: string;
    grade: string;
    section: string;
    issues: string[];
}

interface ValidationReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    errors: ValidationError[];
    validCount: number;
    totalCount: number;
    scope: string;
}

const ValidationReportModal: React.FC<ValidationReportModalProps> = ({
    isOpen,
    onClose,
    errors,
    validCount,
    totalCount,
    scope
}) => {
    const hasErrors = errors.length > 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Validation Report (${scope})`}>
            <div className="space-y-4">
                <div className={`p-4 rounded-md flex items-center gap-3 ${hasErrors ? 'bg-red-50 text-red-900' : 'bg-green-50 text-green-900'}`}>
                    {hasErrors ? <XCircle className="h-6 w-6 text-red-600" /> : <CheckCircle className="h-6 w-6 text-green-600" />}
                    <div>
                        <h4 className="font-bold">{hasErrors ? "Validation Failed" : "Validation Successful"}</h4>
                        <p className="text-sm">
                            {validCount} / {totalCount} assignments are valid.
                            {hasErrors && ` Found ${errors.length} issues that need attention.`}
                        </p>
                    </div>
                </div>

                {hasErrors && (
                    <div className="border rounded-md overflow-hidden max-h-[60vh] flex flex-col">
                        <div className="bg-muted p-2 font-medium text-sm grid grid-cols-12 gap-2 border-b">
                            <div className="col-span-1">Row</div>
                            <div className="col-span-4">Context</div>
                            <div className="col-span-7">Issues</div>
                        </div>
                        <div className="overflow-y-auto p-2 space-y-2">
                            {errors.map((err, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 text-sm p-2 border-b last:border-0 hover:bg-muted/10">
                                    <div className="col-span-1 font-mono text-muted-foreground">#{err.row}</div>
                                    <div className="col-span-4 space-y-1">
                                        <div className="font-medium">{err.teacher}</div>
                                        <div className="text-xs text-muted-foreground">{err.subject}</div>
                                        <div className="text-xs badge badge-outline">{err.grade} - {err.section}</div>
                                    </div>
                                    <div className="col-span-7 text-red-600 space-y-1">
                                        {err.issues.map((issue, i) => (
                                            <div key={i} className="flex items-start gap-1">
                                                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                                                <span>{issue}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-end">
                    <Button onClick={onClose}>Close</Button>
                </div>
            </div>
        </Modal>
    );
};

export default ValidationReportModal;
