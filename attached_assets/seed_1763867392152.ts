import { db } from './client';
import * as schema from './schema';

const AIAG_VDA_SEVERITY = [
  { rating: 10, description: 'Hazardous - without warning', criteria: 'Very high severity with no warning' },
  { rating: 9, description: 'Hazardous - with warning', criteria: 'Very high severity with warning' },
  { rating: 8, description: 'Very High', criteria: 'Vehicle/item inoperable with loss of primary function' },
  { rating: 7, description: 'High', criteria: 'Vehicle/item operable but with reduced performance' },
  { rating: 6, description: 'Moderate', criteria: 'Vehicle/item operable with significant degradation' },
  { rating: 5, description: 'Low', criteria: 'Moderate effect on performance' },
  { rating: 4, description: 'Very Low', criteria: 'Minor effect on performance' },
  { rating: 3, description: 'Minor', criteria: 'Fit/finish item does not conform, noticed by most customers' },
  { rating: 2, description: 'Very Minor', criteria: 'Fit/finish item does not conform, noticed by discriminating customers' },
  { rating: 1, description: 'None', criteria: 'No discernible effect' },
];

const AIAG_VDA_OCCURRENCE = [
  { rating: 10, description: 'Very High: ≥1 in 2', criteria: 'Cpk < 0.33' },
  { rating: 9, description: 'Very High: 1 in 3', criteria: 'Cpk ≥ 0.33' },
  { rating: 8, description: 'High: 1 in 8', criteria: 'Cpk ≥ 0.51' },
  { rating: 7, description: 'High: 1 in 20', criteria: 'Cpk ≥ 0.67' },
  { rating: 6, description: 'Moderate: 1 in 80', criteria: 'Cpk ≥ 0.83' },
  { rating: 5, description: 'Moderate: 1 in 400', criteria: 'Cpk ≥ 1.00' },
  { rating: 4, description: 'Moderate: 1 in 2,000', criteria: 'Cpk ≥ 1.17' },
  { rating: 3, description: 'Low: 1 in 15,000', criteria: 'Cpk ≥ 1.33' },
  { rating: 2, description: 'Remote: 1 in 150,000', criteria: 'Cpk ≥ 1.50' },
  { rating: 1, description: 'Remote: <1 in 1,500,000', criteria: 'Cpk ≥ 1.67' },
];

const AIAG_VDA_DETECTION = [
  { rating: 10, description: 'Absolute Uncertainty', criteria: 'No detection method or not checked' },
  { rating: 9, description: 'Very Remote', criteria: 'Detection capability very low' },
  { rating: 8, description: 'Remote', criteria: 'Detection capability low' },
  { rating: 7, description: 'Very Low', criteria: 'Detection capability very low' },
  { rating: 6, description: 'Low', criteria: 'Detection capability low' },
  { rating: 5, description: 'Moderate', criteria: 'Detection capability moderate' },
  { rating: 4, description: 'Moderately High', criteria: 'Detection capability moderately high' },
  { rating: 3, description: 'High', criteria: 'Detection capability high' },
  { rating: 2, description: 'Very High', criteria: 'Detection capability very high' },
  { rating: 1, description: 'Almost Certain', criteria: 'Detection almost certain' },
];

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create rating scales
    console.log('  → Creating rating scales...');
    await db.insert(schema.ratingScale).values([
      { version: 'AIAG-VDA-2019', kind: 'S', tableJson: AIAG_VDA_SEVERITY },
      { version: 'AIAG-VDA-2019', kind: 'O', tableJson: AIAG_VDA_OCCURRENCE },
      { version: 'AIAG-VDA-2019', kind: 'D', tableJson: AIAG_VDA_DETECTION },
    ]);

    // Create gages
    console.log('  → Creating measurement equipment...');
    const [cmmGage, micrometerGage] = await db.insert(schema.gageLibrary).values([
      { name: 'Zeiss CMM', model: 'Contura G2', resolution: '0.001 mm', calibrationIntervalDays: 365, status: 'active' },
      { name: 'Micrometer Digital', model: 'Mitutoyo 293-340', resolution: '0.001 mm', calibrationIntervalDays: 180, status: 'active' },
    ]).returning();

    // Create calibration records
    console.log('  → Creating calibration records...');
    await db.insert(schema.calibrationLink).values([
      {
        gageId: cmmGage.id,
        calibDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'OK',
      },
      {
        gageId: micrometerGage.id,
        calibDue: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        status: 'OK',
      },
    ]);

    // User ID for seeding
    const seedUserId = crypto.randomUUID();

    // Create Injection Molding Process
    console.log('  → Creating Injection Molding process...');
    const [injectionMolding] = await db.insert(schema.processDef).values({
      name: 'Injection Molding',
      rev: '2.1.0',
      status: 'effective',
      effectiveFrom: new Date('2024-01-01'),
      createdBy: seedUserId,
    }).returning();

    const [step1, step2, step3] = await db.insert(schema.processStep).values([
      { processDefId: injectionMolding.id, seq: 10, name: 'Receive resin', area: 'Materials' },
      { processDefId: injectionMolding.id, seq: 20, name: 'Dry resin', area: 'Materials' },
      { 
        processDefId: injectionMolding.id, 
        seq: 30, 
        name: 'Mold part', 
        area: 'Molding', 
        equipment: [{ name: 'Injection Press', model: 'Engel 200T' }] 
      },
    ]).returning();

    const [fmeaRow1] = await db.insert(schema.fmeaTemplateRow).values({
      processDefId: injectionMolding.id,
      stepId: step3.id,
      function: 'Form part to specification',
      requirement: 'CTQs per print',
      failureMode: 'Short shot',
      effect: 'Fit failure at assembly',
      severity: 8,
      cause: 'Low pack pressure',
      occurrence: 4,
      preventionControls: ['Pack pressure control', 'Process validation'],
      detectionControls: ['Startup first-piece inspection'],
      detection: 6,
      ap: 'H',
      specialFlag: false,
    }).returning();

    await db.insert(schema.controlTemplateRow).values({
      processDefId: injectionMolding.id,
      sourceTemplateRowId: fmeaRow1.id,
      characteristicName: 'Critical dimension',
      charId: 'C-100',
      type: 'Product',
      target: '3.50 mm',
      tolerance: '±0.20 mm',
      specialFlag: true,
      csrSymbol: 'Ⓢ',
      measurementSystem: 'CMM',
      gageDetails: 'Zeiss Contura G2',
      defaultSampleSize: '5/lot',
      defaultFrequency: '1/shift',
      controlMethod: 'X̄-R Chart',
      acceptanceCriteria: 'Cpk ≥ 1.33',
      reactionPlan: 'Contain → adjust pack pressure → verify 1st piece OK',
    });

    // Create additional processes
    console.log('  → Creating additional processes...');
    const [degate] = await db.insert(schema.processDef).values({
      name: 'Degate & Trim',
      rev: '1.0.0',
      status: 'effective',
      effectiveFrom: new Date('2024-01-01'),
      createdBy: seedUserId,
    }).returning();

    await db.insert(schema.processStep).values([
      { processDefId: degate.id, seq: 10, name: 'Manual degate', area: 'Finishing' },
      { processDefId: degate.id, seq: 20, name: 'Trim flash', area: 'Finishing' },
    ]);

    const [weld] = await db.insert(schema.processDef).values({
      name: 'Ultrasonic Weld',
      rev: '1.2.0',
      status: 'effective',
      effectiveFrom: new Date('2024-01-01'),
      createdBy: seedUserId,
    }).returning();

    await db.insert(schema.processStep).values([
      { processDefId: weld.id, seq: 10, name: 'Position parts', area: 'Assembly' },
      { 
        processDefId: weld.id, 
        seq: 20, 
        name: 'Weld', 
        area: 'Assembly', 
        equipment: [{ name: 'Branson Ultrasonic', settings: { amplitude: '80%', weldTime: '0.5s' } }] 
      },
      { processDefId: weld.id, seq: 30, name: 'Leak test', area: 'Assembly' },
    ]);

    const [inspect] = await db.insert(schema.processDef).values({
      name: 'Final Inspection',
      rev: '1.0.0',
      status: 'effective',
      effectiveFrom: new Date('2024-01-01'),
      createdBy: seedUserId,
    }).returning();

    await db.insert(schema.processStep).values([
      { processDefId: inspect.id, seq: 10, name: 'Visual inspection', area: 'QC' },
      { processDefId: inspect.id, seq: 20, name: 'Dimensional check', area: 'QC' },
      { processDefId: inspect.id, seq: 30, name: 'Pack for shipment', area: 'Shipping' },
    ]);

    // Create sample part
    console.log('  → Creating sample part...');
    const [part] = await db.insert(schema.part).values({
      customer: 'Kautex',
      program: 'EOS',
      partNumber: '3004-XYZ',
      partName: 'Stiffener',
      plant: 'Fraser',
      csrNotes: 'Seal thickness Ⓢ requires Cpk ≥ 1.67',
    }).returning();

    // Map processes to part
    console.log('  → Mapping processes to part...');
    await db.insert(schema.partProcessMap).values([
      { partId: part.id, processDefId: injectionMolding.id, processRev: '2.1.0', sequence: 10 },
      { partId: part.id, processDefId: degate.id, processRev: '1.0.0', sequence: 20 },
      { partId: part.id, processDefId: inspect.id, processRev: '1.0.0', sequence: 30 },
    ]);

    console.log('✅ Seed complete!');
    console.log(`   Part ID: ${part.id}`);
    console.log(`   Part Number: ${part.partNumber}`);
    console.log(`   Injection Molding Process ID: ${injectionMolding.id}`);
    console.log(`   Process Steps: ${[step1, step2, step3].length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
