// ─── Pricing Engine (Omega / GlasAve style) ───

export interface PricingInput {
  partCost: number;
  laborRate: number;
  laborHours: number;
  moldingCost: number;
  kitCost: number;
  calibrationCost: number;
  otherCharges: number;
  discount: number;
  taxRate: number;
  isInsuranceJob: boolean;
  deductible: number;
}

export interface PricingOutput {
  retailPrice: number;
  partCost: number;
  laborCost: number;
  moldingCost: number;
  kitCost: number;
  calibrationCost: number;
  otherCharges: number;
  subtotal: number;
  discount: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  insurancePays: number;
  customerPays: number;
  deductible: number;
}

const PARTS_MARKUP = 1.45;
const MOLDING_MARKUP = 1.35;

export function calculatePricing(input: PricingInput): PricingOutput {
  const retailPrice = Math.round(input.partCost * PARTS_MARKUP * 100) / 100;
  const laborCost = Math.round(input.laborRate * input.laborHours * 100) / 100;
  const moldingCost = Math.round(input.moldingCost * MOLDING_MARKUP * 100) / 100;
  const kitCost = input.kitCost;
  const calibrationCost = input.calibrationCost;
  const otherCharges = input.otherCharges;

  const subtotal = retailPrice + laborCost + moldingCost + kitCost + calibrationCost + otherCharges;
  const discount = input.discount;
  const taxableAmount = subtotal - discount;
  const taxAmount = Math.round(taxableAmount * input.taxRate * 100) / 100;
  const totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;

  let insurancePays = 0;
  let customerPays = totalAmount;
  const deductible = input.deductible;

  if (input.isInsuranceJob) {
    customerPays = deductible;
    insurancePays = totalAmount - deductible;
    if (insurancePays < 0) {
      insurancePays = 0;
      customerPays = totalAmount;
    }
  }

  return {
    retailPrice,
    partCost: input.partCost,
    laborCost,
    moldingCost,
    kitCost,
    calibrationCost,
    otherCharges,
    subtotal,
    discount,
    taxableAmount,
    taxAmount,
    totalAmount,
    insurancePays,
    customerPays,
    deductible,
  };
}
