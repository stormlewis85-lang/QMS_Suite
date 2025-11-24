import { db } from '../server/db';
import { part, processDef, processStep, fmeaTemplateRow, controlTemplateRow, gageLibrary, ratingScale, calibrationLink, pfmea, pfmeaRow, controlPlan, controlPlanRow, equipmentLibrary, equipmentErrorProofing, equipmentControlMethods } from '@shared/schema';
import { eq } from 'drizzle-orm';

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
    await db.transaction(async (tx) => {
      console.log('  → Creating rating scales...');
      await tx.insert(ratingScale).values([
        { version: 'AIAG-VDA-2019', kind: 'S', tableJson: AIAG_VDA_SEVERITY },
        { version: 'AIAG-VDA-2019', kind: 'O', tableJson: AIAG_VDA_OCCURRENCE },
        { version: 'AIAG-VDA-2019', kind: 'D', tableJson: AIAG_VDA_DETECTION },
      ]).onConflictDoNothing();

      console.log('  → Creating measurement equipment...');
      const [cmmGage] = await tx.insert(gageLibrary).values([
        { name: 'Zeiss CMM', model: 'Contura G2', resolution: '0.001 mm', calibrationIntervalDays: 365, status: 'active' },
      ]).returning().catch(() => {
        return tx.select().from(gageLibrary).where(eq(gageLibrary.name, 'Zeiss CMM')).limit(1);
      });

      if (cmmGage) {
        await tx.insert(calibrationLink).values([
          {
            gageId: cmmGage.id,
            calibDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            status: 'OK',
          },
        ]).onConflictDoNothing();
      }

      const seedUserId = crypto.randomUUID();

      console.log('  → Creating sample parts...');
      await tx.insert(part).values([
        { customer: 'Ford', program: 'F-150', partNumber: 'WHL-2024-001', partName: 'Wheel Assembly', plant: 'Detroit' },
        { customer: 'GM', program: 'Silverado', partNumber: 'BRK-2024-007', partName: 'Brake Caliper', plant: 'Arlington' },
        { customer: 'Tesla', program: 'Model Y', partNumber: 'ENG-2024-012', partName: 'Engine Mount', plant: 'Austin' },
        { customer: 'Ford', program: 'Mustang', partNumber: 'SUS-2024-004', partName: 'Suspension Arm', plant: 'Flat Rock' },
      ]).onConflictDoNothing();

      console.log('  → Creating processes...');
      const [injectionMolding] = await tx.insert(processDef).values({
        name: 'Injection Molding',
        rev: 'A',
        status: 'effective',
        effectiveFrom: new Date('2024-01-01'),
        createdBy: seedUserId,
      }).returning().onConflictDoNothing();

      if (injectionMolding) {
        const steps = await tx.insert(processStep).values([
          { processDefId: injectionMolding.id, seq: 10, name: 'Receive resin', area: 'Materials' },
          { processDefId: injectionMolding.id, seq: 20, name: 'Dry resin', area: 'Materials' },
          { 
            processDefId: injectionMolding.id, 
            seq: 30, 
            name: 'Mold part', 
            area: 'Molding', 
            equipment: [{ name: 'Injection Press', model: 'Engel 200T' }] 
          },
        ]).returning().onConflictDoNothing();

        const step3 = steps.find(s => s.seq === 30);
        if (step3) {
          const [fmeaRow1] = await tx.insert(fmeaTemplateRow).values({
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

          if (fmeaRow1) {
            await tx.insert(controlTemplateRow).values({
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
          }
        }
      }

      console.log('  → Creating additional processes...');
      await tx.insert(processDef).values([
        { name: 'Brake Caliper Machining', rev: 'C', status: 'effective', effectiveFrom: new Date('2023-11-20'), createdBy: seedUserId },
        { name: 'Engine Mount Welding', rev: 'B', status: 'review', createdBy: seedUserId },
        { name: 'Suspension Arm Forming', rev: 'A', status: 'draft', createdBy: seedUserId },
        { name: 'Final Inspection', rev: 'A', status: 'effective', effectiveFrom: new Date('2024-02-01'), createdBy: seedUserId },
        { name: 'Paint Application', rev: 'A', status: 'effective', effectiveFrom: new Date('2024-02-01'), createdBy: seedUserId },
      ]).onConflictDoNothing();

      console.log('  → Creating sample PFMEAs and Control Plans...');
      const parts = await tx.select().from(part);
      const wheelPart = parts.find(p => p.partNumber === 'WHL-2024-001');
      
      if (wheelPart) {
        const [pfmeaDoc] = await tx.insert(pfmea).values({
          partId: wheelPart.id,
          rev: 'A',
          docNo: 'PFMEA-WHL-001-A',
          status: 'effective',
          effectiveFrom: new Date('2024-01-15'),
        }).returning().onConflictDoNothing();

        if (pfmeaDoc) {
          await tx.insert(pfmeaRow).values([
            {
              pfmeaId: pfmeaDoc.id,
              stepRef: '10',
              function: 'Receive wheel casting',
              requirement: 'Material per spec WHL-MAT-001',
              failureMode: 'Wrong alloy received',
              effect: 'Structural failure in service',
              severity: '9',
              cause: 'Supplier mix-up',
              occurrence: '3',
              preventionControls: ['Material certification review'],
              detectionControls: ['Incoming material verification'],
              detection: '2',
              ap: '45',
              specialFlag: true,
            },
            {
              pfmeaId: pfmeaDoc.id,
              stepRef: '20',
              function: 'Machine bolt holes',
              requirement: 'Holes Ø8.0 ±0.1mm per print',
              failureMode: 'Hole diameter out of spec',
              effect: 'Bolt torque failure',
              severity: '8',
              cause: 'Drill wear',
              occurrence: '4',
              preventionControls: ['Tool life monitoring', 'Preventive maintenance'],
              detectionControls: ['First piece and periodic inspection'],
              detection: '3',
              ap: '56',
              specialFlag: false,
            },
            {
              pfmeaId: pfmeaDoc.id,
              stepRef: '30',
              function: 'Apply corrosion coating',
              requirement: 'Coating thickness 50-80 µm',
              failureMode: 'Insufficient coating thickness',
              effect: 'Premature corrosion',
              severity: '6',
              cause: 'Low spray pressure',
              occurrence: '3',
              preventionControls: ['Pressure monitoring system'],
              detectionControls: ['Thickness gauge measurement'],
              detection: '2',
              ap: '30',
              specialFlag: false,
            },
          ]).onConflictDoNothing();
        }

        const [controlPlanDoc] = await tx.insert(controlPlan).values({
          partId: wheelPart.id,
          rev: 'A',
          type: 'Production',
          docNo: 'CP-WHL-001-A',
          status: 'effective',
          effectiveFrom: new Date('2024-01-15'),
        }).returning().onConflictDoNothing();

        if (controlPlanDoc) {
          await tx.insert(controlPlanRow).values([
            {
              controlPlanId: controlPlanDoc.id,
              charId: 'C-010',
              characteristicName: 'Material certification',
              type: 'Material',
              target: 'A356-T6',
              tolerance: null,
              specialFlag: true,
              csrSymbol: 'Ⓢ',
              measurementSystem: 'Document review',
              gageDetails: 'Material cert',
              sampleSize: '100%',
              frequency: 'Every lot',
              controlMethod: 'Attribute',
              acceptanceCriteria: 'Cert matches PO',
              reactionPlan: 'Reject lot, return to supplier',
            },
            {
              controlPlanId: controlPlanDoc.id,
              charId: 'C-020',
              characteristicName: 'Bolt hole diameter',
              type: 'Product',
              target: '8.0',
              tolerance: '±0.1',
              specialFlag: true,
              csrSymbol: 'Ⓢ',
              measurementSystem: 'CMM',
              gageDetails: 'Zeiss Contura G2',
              sampleSize: '5/lot',
              frequency: '1/shift',
              controlMethod: 'X̄-R Chart',
              acceptanceCriteria: 'Cpk ≥ 1.33',
              reactionPlan: 'Stop line, adjust tooling, verify 5 pcs OK',
            },
            {
              controlPlanId: controlPlanDoc.id,
              charId: 'C-030',
              characteristicName: 'Coating thickness',
              type: 'Product',
              target: '65',
              tolerance: '±15',
              specialFlag: false,
              csrSymbol: null,
              measurementSystem: 'Coating thickness gauge',
              gageDetails: 'Elcometer 456',
              sampleSize: '3/hr',
              frequency: 'Continuous',
              controlMethod: 'Individual-MR Chart',
              acceptanceCriteria: '50-80 µm',
              reactionPlan: 'Adjust spray pressure, recoat if needed',
            },
          ]).onConflictDoNothing();
        }
      }

      console.log('  → Creating equipment library...');
      
      const [engelPress200] = await tx.insert(equipmentLibrary).values({
        name: 'Engel Injection Press 200T',
        type: 'injection_press',
        manufacturer: 'Engel',
        model: 'e-victory 200/50',
        serialNumber: 'EP-200-2024-001',
        location: 'Molding Cell A',
        status: 'active',
        specifications: {
          clampForce: '200 tons',
          shotSize: '250 grams',
          injectionPressure: '2200 bar',
          heatingZones: 5,
        },
      }).returning().onConflictDoNothing();

      const [engelPress350] = await tx.insert(equipmentLibrary).values({
        name: 'Engel Injection Press 350T',
        type: 'injection_press',
        manufacturer: 'Engel',
        model: 'e-victory 350/100',
        serialNumber: 'EP-350-2024-002',
        location: 'Molding Cell B',
        status: 'active',
        specifications: {
          clampForce: '350 tons',
          shotSize: '500 grams',
          injectionPressure: '2400 bar',
          heatingZones: 6,
        },
      }).returning().onConflictDoNothing();

      const [bransonWelder] = await tx.insert(equipmentLibrary).values({
        name: 'Branson Ultrasonic Welder',
        type: 'ultrasonic_welder',
        manufacturer: 'Branson',
        model: 'DCX 2000',
        serialNumber: 'BW-2000-2024-001',
        location: 'Assembly Station 3',
        status: 'active',
        specifications: {
          frequency: '20 kHz',
          power: '2000 W',
          amplitude: '50-150 µm',
          weldArea: '100x100 mm',
        },
      }).returning().onConflictDoNothing();

      const [fanucRobot] = await tx.insert(equipmentLibrary).values({
        name: 'Fanuc Robot M-20iA',
        type: 'robot',
        manufacturer: 'Fanuc',
        model: 'M-20iA/35M',
        serialNumber: 'FR-20-2024-001',
        location: 'Assembly Cell 1',
        status: 'active',
        specifications: {
          payload: '35 kg',
          reach: '1811 mm',
          repeatability: '±0.08 mm',
          axes: 6,
        },
      }).returning().onConflictDoNothing();

      if (engelPress200) {
        await tx.insert(equipmentErrorProofing).values([
          {
            equipmentId: engelPress200.id,
            name: 'Cavity pressure monitoring',
            controlType: 'prevention',
            description: 'Real-time cavity pressure monitoring with adaptive fill control. Triggers auto-adjustment if pressure < 90% target.',
            failureModesAddressed: ['Short shot', 'Incomplete fill', 'Underpacking'],
            suggestedDetectionRating: null,
          },
          {
            equipmentId: engelPress200.id,
            name: 'Clamp force monitoring',
            controlType: 'prevention',
            description: 'Mold protection system with clamp force sensor. Machine stops if force deviation > 5% from setpoint.',
            failureModesAddressed: ['Flash', 'Mold damage', 'Parting line defects'],
            suggestedDetectionRating: null,
          },
          {
            equipmentId: engelPress200.id,
            name: 'Vision inspection system',
            controlType: 'detection',
            description: 'Automated vision inspection of first piece and periodic samples for contamination and surface defects.',
            failureModesAddressed: ['Contamination', 'Foreign material', 'Surface defects'],
            suggestedDetectionRating: 2,
          },
          {
            equipmentId: engelPress200.id,
            name: 'In-mold dimensional sensors',
            controlType: 'detection',
            description: 'Real-time measurement of critical dimensions using in-mold sensors. Parts flagged if outside ±0.1mm tolerance.',
            failureModesAddressed: ['Dimensional out-of-spec', 'Warpage', 'Shrinkage'],
            suggestedDetectionRating: 3,
          },
        ]).onConflictDoNothing();

        await tx.insert(equipmentControlMethods).values([
          {
            equipmentId: engelPress200.id,
            characteristicType: 'process',
            characteristicName: 'Cavity pressure peak',
            controlMethod: 'Automatic 100%',
            measurementSystem: 'Pressure transducer',
            sampleSize: 'Every shot',
            frequency: 'Continuous',
            acceptanceCriteria: '750-850 bar',
            reactionPlan: 'Auto-adjust hold pressure within tolerance; alert if >3 consecutive OOT',
          },
          {
            equipmentId: engelPress200.id,
            characteristicType: 'process',
            characteristicName: 'Melt temperature',
            controlMethod: 'Automatic 100%',
            measurementSystem: 'Thermocouple (barrel zone 4)',
            sampleSize: 'Every shot',
            frequency: 'Continuous',
            acceptanceCriteria: '235-245°C',
            reactionPlan: 'Stop machine if >250°C or <230°C; verify heater bands',
          },
          {
            equipmentId: engelPress200.id,
            characteristicType: 'process',
            characteristicName: 'Cycle time',
            controlMethod: 'Automatic 100%',
            measurementSystem: 'Machine controller timer',
            sampleSize: 'Every shot',
            frequency: 'Continuous',
            acceptanceCriteria: '42-48 sec',
            reactionPlan: 'Trend monitoring; investigate if >50 sec (cooling issue)',
          },
          {
            equipmentId: engelPress200.id,
            characteristicType: 'product',
            characteristicName: 'Part weight',
            controlMethod: 'X̄-R Chart',
            measurementSystem: 'Digital scale',
            sampleSize: '5 parts/hour',
            frequency: 'Hourly',
            acceptanceCriteria: '123-127 g',
            reactionPlan: 'Adjust shot size if trend shows drift; verify material dried properly',
          },
        ]).onConflictDoNothing();
      }

      if (bransonWelder) {
        await tx.insert(equipmentErrorProofing).values([
          {
            equipmentId: bransonWelder.id,
            name: 'Weld energy monitoring',
            controlType: 'prevention',
            description: 'Energy monitoring with adaptive weld algorithm. Machine rejects if weld energy < 95% or >105% target.',
            failureModesAddressed: ['Weak weld', 'Insufficient bond strength', 'Cold weld'],
            suggestedDetectionRating: null,
          },
          {
            equipmentId: bransonWelder.id,
            name: 'Collapse distance monitoring',
            controlType: 'prevention',
            description: 'Collapse distance monitoring with hard stops. Auto-stop if collapse > 2.5mm (excessive melt).',
            failureModesAddressed: ['Part damage', 'Over-welding', 'Melt-through'],
            suggestedDetectionRating: null,
          },
          {
            equipmentId: bransonWelder.id,
            name: 'Vision position verification',
            controlType: 'detection',
            description: 'Vision system pre-weld position verification. Weld blocked if position deviation > 0.5mm.',
            failureModesAddressed: ['Misalignment', 'Part positioning error'],
            suggestedDetectionRating: 2,
          },
        ]).onConflictDoNothing();

        await tx.insert(equipmentControlMethods).values([
          {
            equipmentId: bransonWelder.id,
            characteristicType: 'process',
            characteristicName: 'Weld energy',
            controlMethod: 'Automatic 100%',
            measurementSystem: 'Integrated energy meter',
            sampleSize: 'Every weld',
            frequency: 'Continuous',
            acceptanceCriteria: '1100-1300 J',
            reactionPlan: 'Auto-flag if OOT; destructive test next 3 welds; adjust amplitude if trend',
          },
          {
            equipmentId: bransonWelder.id,
            characteristicType: 'process',
            characteristicName: 'Weld time',
            controlMethod: 'Automatic 100%',
            measurementSystem: 'Controller timer',
            sampleSize: 'Every weld',
            frequency: 'Continuous',
            acceptanceCriteria: '1.5-2.1 sec',
            reactionPlan: 'Monitor trend; if >2.5 sec, check horn condition',
          },
          {
            equipmentId: bransonWelder.id,
            characteristicType: 'process',
            characteristicName: 'Collapse distance',
            controlMethod: 'Automatic 100%',
            measurementSystem: 'Linear encoder',
            sampleSize: 'Every weld',
            frequency: 'Continuous',
            acceptanceCriteria: '1.7-2.3 mm',
            reactionPlan: 'Part flagged for peel test if <1.5mm or >2.5mm',
          },
        ]).onConflictDoNothing();
      }

      if (fanucRobot) {
        await tx.insert(equipmentErrorProofing).values([
          {
            equipmentId: fanucRobot.id,
            name: 'Gripper force monitoring',
            controlType: 'prevention',
            description: 'Vacuum/gripper force sensor with real-time monitoring. Robot stops if force < 80% target or vacuum < -70 kPa.',
            failureModesAddressed: ['Part drop', 'Loss of vacuum', 'Gripper failure'],
            suggestedDetectionRating: null,
          },
          {
            equipmentId: fanucRobot.id,
            name: 'Vision-guided placement',
            controlType: 'prevention',
            description: 'Vision-guided placement with position feedback. Placement rejected if deviation > 0.5mm from taught point.',
            failureModesAddressed: ['Incorrect placement', 'Position error'],
            suggestedDetectionRating: null,
          },
          {
            equipmentId: fanucRobot.id,
            name: 'Torque monitoring',
            controlType: 'detection',
            description: 'Torque monitoring on all axes with soft limits. E-stop if torque > 90% max or position error > 5mm.',
            failureModesAddressed: ['Collision', 'Obstruction', 'Path interference'],
            suggestedDetectionRating: 1,
          },
        ]).onConflictDoNothing();

        await tx.insert(equipmentControlMethods).values([
          {
            equipmentId: fanucRobot.id,
            characteristicType: 'process',
            characteristicName: 'Gripper vacuum',
            controlMethod: 'Automatic 100%',
            measurementSystem: 'Vacuum sensor',
            sampleSize: 'Every pick',
            frequency: 'Continuous',
            acceptanceCriteria: '-75 to -95 kPa',
            reactionPlan: 'Alert if <-70 kPa; check cups for wear; replace if damaged',
          },
          {
            equipmentId: fanucRobot.id,
            characteristicType: 'process',
            characteristicName: 'Cycle time',
            controlMethod: 'Automatic 100%',
            measurementSystem: 'Controller timer',
            sampleSize: 'Every cycle',
            frequency: 'Continuous',
            acceptanceCriteria: '10-14 sec',
            reactionPlan: 'Monitor trend; if >15 sec, check for path obstructions or axis slowdown',
          },
          {
            equipmentId: fanucRobot.id,
            characteristicType: 'process',
            characteristicName: 'Position repeatability',
            controlMethod: 'X̄-R Chart',
            measurementSystem: 'Taught point verification',
            sampleSize: '10 placements',
            frequency: 'Daily',
            acceptanceCriteria: 'All within ±0.08 mm',
            reactionPlan: 'Re-teach positions if any >0.10mm; check arm backlash',
          },
        ]).onConflictDoNothing();
      }
    });

    console.log('✅ Seed complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
