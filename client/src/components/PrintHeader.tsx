interface PrintHeaderProps {
  title: string;
  docNo?: string;
  rev?: string;
  status?: string;
  partNumber?: string;
  partName?: string;
}

export function PrintHeader({ title, docNo, rev, status, partNumber, partName }: PrintHeaderProps) {
  return (
    <div className="print-only print-header hidden">
      <h1>{title}</h1>
      <div className="doc-info">
        {docNo && <span>Doc No: {docNo} | </span>}
        {rev && <span>Rev: {rev} | </span>}
        {status && <span>Status: {status} | </span>}
        {partNumber && <span>Part: {partNumber} {partName && `- ${partName}`}</span>}
      </div>
      <div className="doc-info" style={{ marginTop: '4px' }}>
        Printed: {new Date().toLocaleString()}
      </div>
    </div>
  );
}

export default PrintHeader;
