import { v4 as uuidv4 } from 'uuid';

let orderCounter = 1000;
let invoiceCounter = 5000;
let quoteCounter = 3000;
let receiptCounter = 8000;
let transferCounter = 100;
let poCounter = 200;

export function generateOrderNumber(): string {
  return `WO-${String(++orderCounter).padStart(6, '0')}`;
}

export function generateInvoiceNumber(): string {
  return `INV-${String(++invoiceCounter).padStart(6, '0')}`;
}

export function generateQuoteNumber(): string {
  return `QT-${String(++quoteCounter).padStart(6, '0')}`;
}

export function generateReceiptNumber(): string {
  return `RCP-${String(++receiptCounter).padStart(8, '0')}`;
}

export function generateTransferNumber(): string {
  return `TRF-${String(++transferCounter).padStart(5, '0')}`;
}

export function generatePONumber(): string {
  return `PO-${String(++poCounter).padStart(5, '0')}`;
}

export function generateId(): string {
  return uuidv4();
}
