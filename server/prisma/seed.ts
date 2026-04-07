import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ═══════════════════════════════════════════════
  // 4 SHOP LOCATIONS
  // ═══════════════════════════════════════════════
  const shops = await Promise.all([
    prisma.shop.create({
      data: {
        name: 'AutoGlass Pod - Downtown',
        code: 'SHOP1',
        address: '100 Main Street',
        city: 'Dallas',
        state: 'TX',
        zip: '75201',
        phone: '214-555-0101',
        email: 'downtown@autoglasspod.com',
        nagsId: 'AGP001',
        taxRate: 0.0825,
        laborRate: 55,
      },
    }),
    prisma.shop.create({
      data: {
        name: 'AutoGlass Pod - North',
        code: 'SHOP2',
        address: '4500 Preston Rd',
        city: 'Plano',
        state: 'TX',
        zip: '75024',
        phone: '214-555-0102',
        email: 'north@autoglasspod.com',
        nagsId: 'AGP002',
        taxRate: 0.0825,
        laborRate: 50,
      },
    }),
    prisma.shop.create({
      data: {
        name: 'AutoGlass Pod - East',
        code: 'SHOP3',
        address: '2200 Mesquite Blvd',
        city: 'Mesquite',
        state: 'TX',
        zip: '75150',
        phone: '214-555-0103',
        email: 'east@autoglasspod.com',
        nagsId: 'AGP003',
        taxRate: 0.0825,
        laborRate: 50,
      },
    }),
    prisma.shop.create({
      data: {
        name: 'AutoGlass Pod - South',
        code: 'SHOP4',
        address: '800 W Belt Line Rd',
        city: 'Cedar Hill',
        state: 'TX',
        zip: '75104',
        phone: '214-555-0104',
        email: 'south@autoglasspod.com',
        nagsId: 'AGP004',
        taxRate: 0.0825,
        laborRate: 48,
      },
    }),
  ]);

  console.log(`Created ${shops.length} shops`);

  // ═══════════════════════════════════════════════
  // USERS
  // ═══════════════════════════════════════════════
  const passwordHash = await bcrypt.hash('password123', 12);

  const admin = await prisma.user.create({
    data: { email: 'admin@autoglass.com', passwordHash, firstName: 'System', lastName: 'Admin', role: 'admin', phone: '214-555-0001', shopId: shops[0].id },
  });

  const manager = await prisma.user.create({
    data: { email: 'manager@autoglass.com', passwordHash, firstName: 'Mike', lastName: 'Johnson', role: 'manager', phone: '214-555-0002', shopId: shops[0].id },
  });

  const csrs = await Promise.all([
    prisma.user.create({ data: { email: 'sarah@autoglass.com', passwordHash, firstName: 'Sarah', lastName: 'Williams', role: 'csr', phone: '214-555-0010', shopId: shops[0].id } }),
    prisma.user.create({ data: { email: 'lisa@autoglass.com', passwordHash, firstName: 'Lisa', lastName: 'Brown', role: 'csr', phone: '214-555-0011', shopId: shops[1].id } }),
  ]);

  const dispatcher = await prisma.user.create({
    data: { email: 'dispatch@autoglass.com', passwordHash, firstName: 'David', lastName: 'Martinez', role: 'dispatcher', phone: '214-555-0020', shopId: shops[0].id },
  });

  const techs = await Promise.all([
    prisma.user.create({ data: { email: 'tech1@autoglass.com', passwordHash, firstName: 'James', lastName: 'Wilson', role: 'technician', phone: '214-555-0030', shopId: shops[0].id } }),
    prisma.user.create({ data: { email: 'tech2@autoglass.com', passwordHash, firstName: 'Carlos', lastName: 'Garcia', role: 'technician', phone: '214-555-0031', shopId: shops[0].id } }),
    prisma.user.create({ data: { email: 'tech3@autoglass.com', passwordHash, firstName: 'Robert', lastName: 'Taylor', role: 'technician', phone: '214-555-0032', shopId: shops[1].id } }),
    prisma.user.create({ data: { email: 'tech4@autoglass.com', passwordHash, firstName: 'Marcus', lastName: 'Lee', role: 'technician', phone: '214-555-0033', shopId: shops[2].id } }),
    prisma.user.create({ data: { email: 'tech5@autoglass.com', passwordHash, firstName: 'Daniel', lastName: 'Hernandez', role: 'technician', phone: '214-555-0034', shopId: shops[3].id } }),
  ]);

  console.log('Created users');

  // ═══════════════════════════════════════════════
  // PODS
  // ═══════════════════════════════════════════════
  const pods = await Promise.all([
    prisma.pod.create({ data: { name: 'Pod Alpha', code: 'POD-01', vehicleMake: 'Ford', vehicleModel: 'Transit', vehicleYear: 2023, vehiclePlate: 'TX-POD01', shopId: shops[0].id, maxJobsPerDay: 6, serviceRadius: 50 } }),
    prisma.pod.create({ data: { name: 'Pod Bravo', code: 'POD-02', vehicleMake: 'RAM', vehicleModel: 'ProMaster', vehicleYear: 2022, vehiclePlate: 'TX-POD02', shopId: shops[0].id, maxJobsPerDay: 6, serviceRadius: 40 } }),
    prisma.pod.create({ data: { name: 'Pod Charlie', code: 'POD-03', vehicleMake: 'Chevrolet', vehicleModel: 'Express', vehicleYear: 2023, vehiclePlate: 'TX-POD03', shopId: shops[1].id, maxJobsPerDay: 5, serviceRadius: 45 } }),
    prisma.pod.create({ data: { name: 'Pod Delta', code: 'POD-04', vehicleMake: 'Ford', vehicleModel: 'E-350', vehicleYear: 2021, vehiclePlate: 'TX-POD04', shopId: shops[2].id, maxJobsPerDay: 6, serviceRadius: 50 } }),
    prisma.pod.create({ data: { name: 'Pod Echo', code: 'POD-05', vehicleMake: 'Mercedes', vehicleModel: 'Sprinter', vehicleYear: 2024, vehiclePlate: 'TX-POD05', shopId: shops[3].id, maxJobsPerDay: 7, serviceRadius: 60 } }),
  ]);

  // Assign techs to pods
  await prisma.user.update({ where: { id: techs[0].id }, data: { podId: pods[0].id } });
  await prisma.user.update({ where: { id: techs[1].id }, data: { podId: pods[1].id } });
  await prisma.user.update({ where: { id: techs[2].id }, data: { podId: pods[2].id } });
  await prisma.user.update({ where: { id: techs[3].id }, data: { podId: pods[3].id } });
  await prisma.user.update({ where: { id: techs[4].id }, data: { podId: pods[4].id } });

  console.log(`Created ${pods.length} pods`);

  // ═══════════════════════════════════════════════
  // NAGS PARTS CATALOG (Aftermarket Glass)
  // ═══════════════════════════════════════════════
  const nagsParts = await Promise.all([
    // Toyota Camry
    prisma.nAGSPart.create({ data: { nagsPartNumber: 'FW04567', description: 'Windshield - Toyota Camry', partType: 'aftermarket', glassPosition: 'windshield', fitsYearFrom: 2018, fitsYearTo: 2024, fitsMake: 'Toyota', fitsModel: 'Camry', tinted: true, sensor: true, adasCompatible: true, cost: 185, listPrice: 350, vendor: 'PGW' } }),
    prisma.nAGSPart.create({ data: { nagsPartNumber: 'FB04567', description: 'Back Glass - Toyota Camry', partType: 'aftermarket', glassPosition: 'rear', fitsYearFrom: 2018, fitsYearTo: 2024, fitsMake: 'Toyota', fitsModel: 'Camry', heated: true, cost: 145, listPrice: 280, vendor: 'PGW' } }),
    prisma.nAGSPart.create({ data: { nagsPartNumber: 'DD04567', description: 'Front Door Glass L - Toyota Camry', partType: 'aftermarket', glassPosition: 'front_left', fitsYearFrom: 2018, fitsYearTo: 2024, fitsMake: 'Toyota', fitsModel: 'Camry', cost: 85, listPrice: 165, vendor: 'XYG' } }),
    // Honda Civic
    prisma.nAGSPart.create({ data: { nagsPartNumber: 'FW05123', description: 'Windshield - Honda Civic', partType: 'aftermarket', glassPosition: 'windshield', fitsYearFrom: 2016, fitsYearTo: 2024, fitsMake: 'Honda', fitsModel: 'Civic', sensor: true, adasCompatible: true, cost: 165, listPrice: 320, vendor: 'Fuyao' } }),
    prisma.nAGSPart.create({ data: { nagsPartNumber: 'FB05123', description: 'Back Glass - Honda Civic', partType: 'aftermarket', glassPosition: 'rear', fitsYearFrom: 2016, fitsYearTo: 2024, fitsMake: 'Honda', fitsModel: 'Civic', heated: true, cost: 125, listPrice: 245, vendor: 'Fuyao' } }),
    // Ford F-150
    prisma.nAGSPart.create({ data: { nagsPartNumber: 'FW06789', description: 'Windshield - Ford F-150', partType: 'aftermarket', glassPosition: 'windshield', fitsYearFrom: 2015, fitsYearTo: 2024, fitsMake: 'Ford', fitsModel: 'F-150', tinted: true, heated: true, sensor: true, adasCompatible: true, cost: 210, listPrice: 395, vendor: 'PGW' } }),
    prisma.nAGSPart.create({ data: { nagsPartNumber: 'FB06789', description: 'Back Glass Slider - Ford F-150', partType: 'aftermarket', glassPosition: 'rear', fitsYearFrom: 2015, fitsYearTo: 2024, fitsMake: 'Ford', fitsModel: 'F-150', heated: true, cost: 195, listPrice: 380, vendor: 'PGW' } }),
    // Chevrolet Silverado
    prisma.nAGSPart.create({ data: { nagsPartNumber: 'FW07234', description: 'Windshield - Chevy Silverado', partType: 'aftermarket', glassPosition: 'windshield', fitsYearFrom: 2019, fitsYearTo: 2024, fitsMake: 'Chevrolet', fitsModel: 'Silverado', tinted: true, sensor: true, adasCompatible: true, cost: 220, listPrice: 410, vendor: 'AGC' } }),
    // Honda Accord
    prisma.nAGSPart.create({ data: { nagsPartNumber: 'FW08456', description: 'Windshield - Honda Accord', partType: 'aftermarket', glassPosition: 'windshield', fitsYearFrom: 2018, fitsYearTo: 2024, fitsMake: 'Honda', fitsModel: 'Accord', sensor: true, adasCompatible: true, cost: 175, listPrice: 340, vendor: 'Fuyao' } }),
    // Toyota RAV4
    prisma.nAGSPart.create({ data: { nagsPartNumber: 'FW09012', description: 'Windshield - Toyota RAV4', partType: 'aftermarket', glassPosition: 'windshield', fitsYearFrom: 2019, fitsYearTo: 2024, fitsMake: 'Toyota', fitsModel: 'RAV4', sensor: true, adasCompatible: true, encapsulated: true, cost: 195, listPrice: 370, vendor: 'PGW' } }),
    // Nissan Altima
    prisma.nAGSPart.create({ data: { nagsPartNumber: 'FW10345', description: 'Windshield - Nissan Altima', partType: 'aftermarket', glassPosition: 'windshield', fitsYearFrom: 2019, fitsYearTo: 2024, fitsMake: 'Nissan', fitsModel: 'Altima', sensor: true, cost: 155, listPrice: 300, vendor: 'XYG' } }),
    // Hyundai Tucson
    prisma.nAGSPart.create({ data: { nagsPartNumber: 'FW11567', description: 'Windshield - Hyundai Tucson', partType: 'aftermarket', glassPosition: 'windshield', fitsYearFrom: 2022, fitsYearTo: 2024, fitsMake: 'Hyundai', fitsModel: 'Tucson', sensor: true, adasCompatible: true, cost: 170, listPrice: 325, vendor: 'Fuyao' } }),
    // Tesla Model 3
    prisma.nAGSPart.create({ data: { nagsPartNumber: 'FW12890', description: 'Windshield - Tesla Model 3', partType: 'aftermarket', glassPosition: 'windshield', fitsYearFrom: 2017, fitsYearTo: 2024, fitsMake: 'Tesla', fitsModel: 'Model 3', tinted: true, sensor: true, adasCompatible: true, cost: 285, listPrice: 525, vendor: 'AGC' } }),
    // BMW 3 Series
    prisma.nAGSPart.create({ data: { nagsPartNumber: 'FW13456', description: 'Windshield - BMW 3 Series', partType: 'aftermarket', glassPosition: 'windshield', fitsYearFrom: 2019, fitsYearTo: 2024, fitsMake: 'BMW', fitsModel: '3 Series', sensor: true, heated: true, adasCompatible: true, cost: 310, listPrice: 580, vendor: 'AGC' } }),
    // Mercedes C-Class
    prisma.nAGSPart.create({ data: { nagsPartNumber: 'FW14789', description: 'Windshield - Mercedes C-Class', partType: 'aftermarket', glassPosition: 'windshield', fitsYearFrom: 2019, fitsYearTo: 2024, fitsMake: 'Mercedes-Benz', fitsModel: 'C-Class', sensor: true, heated: true, adasCompatible: true, cost: 340, listPrice: 625, vendor: 'Saint-Gobain' } }),
    // Jeep Grand Cherokee
    prisma.nAGSPart.create({ data: { nagsPartNumber: 'FW15012', description: 'Windshield - Jeep Grand Cherokee', partType: 'aftermarket', glassPosition: 'windshield', fitsYearFrom: 2022, fitsYearTo: 2024, fitsMake: 'Jeep', fitsModel: 'Grand Cherokee', sensor: true, adasCompatible: true, cost: 225, listPrice: 420, vendor: 'PGW' } }),
    // Subaru Outback
    prisma.nAGSPart.create({ data: { nagsPartNumber: 'FW16345', description: 'Windshield - Subaru Outback', partType: 'aftermarket', glassPosition: 'windshield', fitsYearFrom: 2020, fitsYearTo: 2024, fitsMake: 'Subaru', fitsModel: 'Outback', sensor: true, adasCompatible: true, cost: 200, listPrice: 385, vendor: 'AGC' } }),
    // Kia Forte
    prisma.nAGSPart.create({ data: { nagsPartNumber: 'FW17678', description: 'Windshield - Kia Forte', partType: 'aftermarket', glassPosition: 'windshield', fitsYearFrom: 2019, fitsYearTo: 2024, fitsMake: 'Kia', fitsModel: 'Forte', cost: 135, listPrice: 260, vendor: 'XYG' } }),
    // GMC Sierra
    prisma.nAGSPart.create({ data: { nagsPartNumber: 'FW18901', description: 'Windshield - GMC Sierra', partType: 'aftermarket', glassPosition: 'windshield', fitsYearFrom: 2019, fitsYearTo: 2024, fitsMake: 'GMC', fitsModel: 'Sierra', tinted: true, sensor: true, adasCompatible: true, cost: 225, listPrice: 420, vendor: 'PGW' } }),
    // Dodge RAM 1500
    prisma.nAGSPart.create({ data: { nagsPartNumber: 'FW19234', description: 'Windshield - RAM 1500', partType: 'aftermarket', glassPosition: 'windshield', fitsYearFrom: 2019, fitsYearTo: 2024, fitsMake: 'RAM', fitsModel: '1500', tinted: true, sensor: true, adasCompatible: true, cost: 215, listPrice: 400, vendor: 'PGW' } }),
  ]);

  // Add molding kits for some parts
  await Promise.all([
    prisma.moldingKit.create({ data: { nagsPartId: nagsParts[0].id, moldingPartNumber: 'ML-TC-01', description: 'Windshield Molding Set - Camry', cost: 28, retailPrice: 45, isRequired: true } }),
    prisma.moldingKit.create({ data: { nagsPartId: nagsParts[3].id, moldingPartNumber: 'ML-HC-01', description: 'Windshield Molding Set - Civic', cost: 25, retailPrice: 40, isRequired: true } }),
    prisma.moldingKit.create({ data: { nagsPartId: nagsParts[5].id, moldingPartNumber: 'ML-FF-01', description: 'Windshield Molding Set - F-150', cost: 32, retailPrice: 50, isRequired: true } }),
  ]);

  console.log(`Created ${nagsParts.length} NAGS parts`);

  // ═══════════════════════════════════════════════
  // SHOP INVENTORY (distribute across 4 shops)
  // ═══════════════════════════════════════════════
  for (const shop of shops) {
    for (const part of nagsParts) {
      const qty = Math.floor(Math.random() * 5) + 1;
      await prisma.shopInventory.create({
        data: {
          shopId: shop.id,
          nagsPartId: part.id,
          quantity: qty,
          minQuantity: 1,
          maxQuantity: 8,
          reorderPoint: 2,
          cost: part.cost,
          retailPrice: Math.round(part.cost * 1.45 * 100) / 100,
          binLocation: `${String.fromCharCode(65 + Math.floor(Math.random() * 4))}-${Math.floor(Math.random() * 5) + 1}-${Math.floor(Math.random() * 3) + 1}`,
          status: qty <= 1 ? 'low_stock' : 'in_stock',
        },
      });
    }
  }

  console.log('Populated shop inventory');

  // ═══════════════════════════════════════════════
  // SAMPLE CUSTOMERS & VEHICLES
  // ═══════════════════════════════════════════════
  const customers = await Promise.all([
    prisma.customer.create({ data: { firstName: 'John', lastName: 'Smith', phone: '214-555-1001', email: 'john.smith@email.com', address: '123 Oak Lane', city: 'Dallas', state: 'TX', zip: '75201', source: 'phone' } }),
    prisma.customer.create({ data: { firstName: 'Maria', lastName: 'Rodriguez', phone: '214-555-1002', email: 'maria.r@email.com', address: '456 Elm St', city: 'Plano', state: 'TX', zip: '75024', source: 'website' } }),
    prisma.customer.create({ data: { firstName: 'Robert', lastName: 'Davis', phone: '214-555-1003', address: '789 Pine Dr', city: 'Mesquite', state: 'TX', zip: '75150', source: 'insurance_referral' } }),
    prisma.customer.create({ data: { firstName: 'Jennifer', lastName: 'Anderson', phone: '214-555-1004', email: 'jen.a@email.com', address: '321 Cedar Blvd', city: 'Cedar Hill', state: 'TX', zip: '75104', source: 'walk_in' } }),
    prisma.customer.create({ data: { firstName: 'DFW Fleet Services', lastName: 'Corp', phone: '214-555-1005', email: 'fleet@dfwfleet.com', company: 'DFW Fleet Services', isFleet: true, fleetName: 'DFW Fleet', source: 'fleet' } }),
  ]);

  const vehicles = await Promise.all([
    prisma.vehicle.create({ data: { customerId: customers[0].id, year: 2022, make: 'Toyota', model: 'Camry', color: 'Silver', vin: '4T1BF1FK0NU123456', plateNumber: 'ABC-1234', plateState: 'TX' } }),
    prisma.vehicle.create({ data: { customerId: customers[1].id, year: 2023, make: 'Honda', model: 'Civic', color: 'Blue', vin: '2HGFC2F53PH123456', plateNumber: 'DEF-5678', plateState: 'TX' } }),
    prisma.vehicle.create({ data: { customerId: customers[2].id, year: 2021, make: 'Ford', model: 'F-150', color: 'White', vin: '1FTEW1EP0MFA12345', plateNumber: 'GHI-9012', plateState: 'TX' } }),
    prisma.vehicle.create({ data: { customerId: customers[3].id, year: 2024, make: 'Tesla', model: 'Model 3', color: 'Red', vin: '5YJ3E1EA8PF123456', plateNumber: 'JKL-3456', plateState: 'TX' } }),
    prisma.vehicle.create({ data: { customerId: customers[4].id, year: 2023, make: 'Chevrolet', model: 'Silverado', color: 'Black', plateNumber: 'MNO-7890', plateState: 'TX' } }),
    prisma.vehicle.create({ data: { customerId: customers[4].id, year: 2022, make: 'Ford', model: 'F-150', color: 'White', plateNumber: 'PQR-1122', plateState: 'TX' } }),
  ]);

  console.log('Created sample customers and vehicles');

  // ═══════════════════════════════════════════════
  // SAMPLE WORK ORDERS
  // ═══════════════════════════════════════════════
  const workOrders = await Promise.all([
    prisma.workOrder.create({
      data: {
        orderNumber: 'WO-000001',
        shopId: shops[0].id,
        customerId: customers[0].id,
        vehicleId: vehicles[0].id,
        podId: pods[0].id,
        technicianId: techs[0].id,
        csrId: csrs[0].id,
        status: 'completed',
        jobType: 'replacement',
        glassPosition: 'windshield',
        serviceLocation: 'mobile',
        serviceAddress: '123 Oak Lane, Dallas TX',
        nagsPartNumber: 'FW04567',
        partDescription: 'Windshield - Toyota Camry',
        partType: 'aftermarket',
        retailPrice: 268.25,
        partCost: 185,
        laborCost: 55,
        moldingCost: 37.80,
        kitCost: 25,
        totalAmount: 418.80,
        taxAmount: 32.75,
        isInsuranceJob: true,
        insuranceCompanyCode: 'STA',
        claimNumber: 'CLM-2024-00123',
        policyNumber: 'POL-SF-987654',
        deductible: 100,
        insurancePays: 318.80,
        customerPays: 100,
        requiresCalibration: true,
        calibrationType: 'static',
        calibrationCost: 0,
        completedAt: new Date(),
      },
    }),
    prisma.workOrder.create({
      data: {
        orderNumber: 'WO-000002',
        shopId: shops[0].id,
        customerId: customers[1].id,
        vehicleId: vehicles[1].id,
        status: 'pending',
        jobType: 'replacement',
        glassPosition: 'windshield',
        serviceLocation: 'shop',
        nagsPartNumber: 'FW05123',
        partDescription: 'Windshield - Honda Civic',
        partType: 'aftermarket',
        retailPrice: 239.25,
        partCost: 165,
        laborCost: 50,
        kitCost: 25,
        totalAmount: 340.56,
        taxAmount: 26.31,
        csrId: csrs[0].id,
      },
    }),
    prisma.workOrder.create({
      data: {
        orderNumber: 'WO-000003',
        shopId: shops[1].id,
        customerId: customers[2].id,
        vehicleId: vehicles[2].id,
        podId: pods[2].id,
        technicianId: techs[2].id,
        status: 'scheduled',
        jobType: 'replacement',
        glassPosition: 'windshield',
        serviceLocation: 'mobile',
        serviceAddress: '789 Pine Dr, Mesquite TX',
        nagsPartNumber: 'FW06789',
        partDescription: 'Windshield - Ford F-150',
        partType: 'aftermarket',
        retailPrice: 304.50,
        partCost: 210,
        laborCost: 55,
        moldingCost: 43.20,
        kitCost: 25,
        totalAmount: 462.00,
        taxAmount: 34.30,
        scheduledDate: new Date(Date.now() + 86400000),
        scheduledSlot: 'morning',
        scheduledTime: '09:00',
        isInsuranceJob: true,
        insuranceCompanyCode: 'PRG',
        claimNumber: 'CLM-2024-00456',
        policyNumber: 'POL-PRG-123456',
        deductible: 250,
        insurancePays: 212.00,
        customerPays: 250,
      },
    }),
  ]);

  console.log('Created sample work orders');
  console.log('Seed complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
