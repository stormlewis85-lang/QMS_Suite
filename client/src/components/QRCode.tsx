import { QRCodeSVG } from 'qrcode.react';

interface QRCodeProps {
  value: string;
  size?: number;
  includeMargin?: boolean;
  title?: string;
}

export function QRCode({ value, size = 100, includeMargin = true, title }: QRCodeProps) {
  return (
    <div className="qr-code-print print-only hidden text-center">
      <QRCodeSVG 
        value={value} 
        size={size}
        includeMargin={includeMargin}
        level="M"
      />
      {title && (
        <p className="text-xs text-muted-foreground mt-2">{title}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Scan to verify document
      </p>
    </div>
  );
}

export default QRCode;
