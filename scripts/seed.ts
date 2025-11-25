import { db } from '../server/db';
import { part, processDef, processStep, fmeaTemplateRow, controlTemplateRow, gageLibrary, ratingScale, calibrationLink, pfmea, pfmeaRow, controlPlan, controlPlanRow, equipmentLibrary, equipmentErrorProofing, equipmentControlMethods, failureModesLibrary } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Comprehensive Automotive Failure Modes Catalog
const AUTOMOTIVE_FAILURE_MODES = [
  // INJECTION MOLDING - DIMENSIONAL
  {
    category: 'dimensional' as const,
    failureMode: 'Short shot',
    genericEffect: 'Incomplete part geometry, fit/function failure',
    typicalCauses: [
      'Insufficient pack pressure',
      'Low melt temperature',
      'Insufficient shot size',
      'Restricted gate/runner',
      'Premature gate freeze-off',
      'Venting inadequate'
    ],
    applicableProcesses: ['Injection Molding', 'Insert Molding', 'Overmolding'],
    defaultSeverity: 8,
    defaultOccurrence: 4,
    tags: ['molding', 'dimensional', 'critical'],
    industryStandard: 'AIAG-VDA 2019',
    status: 'active',
  },
  {
    category: 'dimensional' as const,
    failureMode: 'Flash/burr',
    genericEffect: 'Excess material requiring trim, potential fit issues',
    typicalCauses: [
      'Excessive injection pressure',
      'Worn mold parting line',
      'Insufficient clamp tonnage',
      'Mold alignment issue',
      'Foreign material on parting line'
    ],
    applicableProcesses: ['Injection Molding', 'Compression Molding'],
    defaultSeverity: 5,
    defaultOccurrence: 5,
    tags: ['molding', 'dimensional', 'trim'],
    status: 'active',
  },
  {
    category: 'dimensional' as const,
    failureMode: 'Sink marks',
    genericEffect: 'Surface depression, cosmetic defect',
    typicalCauses: [
      'Insufficient pack pressure',
      'Insufficient pack time',
      'Heavy wall section design',
      'Gate location suboptimal',
      'Early gate freeze-off'
    ],
    applicableProcesses: ['Injection Molding'],
    defaultSeverity: 6,
    defaultOccurrence: 4,
    tags: ['molding', 'cosmetic'],
    status: 'active',
  },
  {
    category: 'dimensional' as const,
    failureMode: 'Warpage/distortion',
    genericEffect: 'Part out of flatness specification, fit failure',
    typicalCauses: [
      'Uneven cooling',
      'High residual stress',
      'Non-uniform wall thickness',
      'Improper ejection',
      'Material orientation issues'
    ],
    applicableProcesses: ['Injection Molding', 'Thermoforming'],
    defaultSeverity: 7,
    defaultOccurrence: 5,
    tags: ['molding', 'dimensional'],
    status: 'active',
  },
  {
    category: 'dimensional' as const,
    failureMode: 'Dimension out of tolerance',
    genericEffect: 'Part does not meet print specification',
    typicalCauses: [
      'Tool wear',
      'Machine drift',
      'Setup error',
      'Temperature variation',
      'Workholding inadequate',
      'Measurement error'
    ],
    applicableProcesses: ['Machining', 'Drilling', 'Trimming', 'Routing', 'Injection Molding'],
    defaultSeverity: 7,
    defaultOccurrence: 4,
    tags: ['machining', 'dimensional'],
    status: 'active',
  },

  // VISUAL DEFECTS
  {
    category: 'visual' as const,
    failureMode: 'Flow lines/weld lines',
    genericEffect: 'Visible lines on surface, potential weak points',
    typicalCauses: [
      'Low melt temperature',
      'Low mold temperature',
      'Slow injection speed',
      'Gate location suboptimal',
      'Multiple flow fronts meeting'
    ],
    applicableProcesses: ['Injection Molding'],
    defaultSeverity: 4,
    defaultOccurrence: 6,
    tags: ['molding', 'cosmetic'],
    status: 'active',
  },
  {
    category: 'visual' as const,
    failureMode: 'Surface contamination',
    genericEffect: 'Foreign material embedded in part surface',
    typicalCauses: [
      'Airborne contamination',
      'Material handling issue',
      'Unclean mold surface',
      'Degraded material',
      'Cross-contamination from previous run'
    ],
    applicableProcesses: ['All processes'],
    defaultSeverity: 5,
    defaultOccurrence: 3,
    tags: ['contamination', 'cosmetic'],
    status: 'active',
  },
  {
    category: 'visual' as const,
    failureMode: 'Orange peel/poor surface finish',
    genericEffect: 'Cosmetic defect, customer dissatisfaction',
    typicalCauses: [
      'Spray pressure too high',
      'Material viscosity incorrect',
      'Application temperature wrong',
      'Surface preparation inadequate',
      'Flash-off time insufficient'
    ],
    applicableProcesses: ['Painting', 'Powder Coating'],
    defaultSeverity: 4,
    defaultOccurrence: 5,
    tags: ['coating', 'cosmetic'],
    status: 'active',
  },
  {
    category: 'visual' as const,
    failureMode: 'Color variation/mismatch',
    genericEffect: 'Parts do not match color standard, customer rejection',
    typicalCauses: [
      'Color lot variation',
      'Incorrect let-down ratio',
      'Temperature variation affecting color',
      'Material degradation',
      'Mixing with regrind'
    ],
    applicableProcesses: ['Injection Molding', 'Painting'],
    defaultSeverity: 5,
    defaultOccurrence: 4,
    tags: ['molding', 'cosmetic', 'color'],
    status: 'active',
  },

  // ASSEMBLY DEFECTS
  {
    category: 'assembly' as const,
    failureMode: 'Incomplete weld',
    genericEffect: 'Joint strength below specification, potential leak',
    typicalCauses: [
      'Insufficient weld time',
      'Low amplitude setting',
      'Part misalignment',
      'Contaminated joint surface',
      'Fixture/nest worn or damaged'
    ],
    applicableProcesses: ['Ultrasonic Weld', 'Vibration Weld', 'Spin Weld'],
    defaultSeverity: 9,
    defaultOccurrence: 3,
    tags: ['welding', 'safety', 'critical'],
    industryStandard: 'Customer CSR',
    status: 'active',
  },
  {
    category: 'assembly' as const,
    failureMode: 'Component missing',
    genericEffect: 'Incomplete assembly, function failure',
    typicalCauses: [
      'Operator error',
      'Feeder malfunction',
      'Part shortage in workstation',
      'Double-feed from previous cycle',
      'Vision system failure'
    ],
    applicableProcesses: ['Manual Assembly', 'Automated Assembly'],
    defaultSeverity: 9,
    defaultOccurrence: 2,
    tags: ['assembly', 'safety'],
    status: 'active',
  },
  {
    category: 'assembly' as const,
    failureMode: 'Incorrect component installed',
    genericEffect: 'Wrong variant assembled, function failure',
    typicalCauses: [
      'Mixed parts in bin',
      'Operator confusion',
      'Inadequate visual differentiation',
      'Work instruction unclear',
      'Verification system bypassed'
    ],
    applicableProcesses: ['Manual Assembly', 'Automated Assembly'],
    defaultSeverity: 8,
    defaultOccurrence: 3,
    tags: ['assembly', 'mix-up'],
    status: 'active',
  },
  {
    category: 'assembly' as const,
    failureMode: 'Incorrect torque',
    genericEffect: 'Fastener loosening or stripping, function/safety failure',
    typicalCauses: [
      'Tool not calibrated',
      'Wrong torque setting',
      'Cross-threaded fastener',
      'Contaminated threads',
      'Wrong fastener grade'
    ],
    applicableProcesses: ['Fastener Assembly', 'Final Assembly'],
    defaultSeverity: 8,
    defaultOccurrence: 3,
    tags: ['assembly', 'fastener', 'safety'],
    industryStandard: 'AIAG-VDA 2019',
    status: 'active',
  },
  {
    category: 'assembly' as const,
    failureMode: 'Parts reversed/backwards',
    genericEffect: 'Assembly will not function, customer line down',
    typicalCauses: [
      'Part symmetry allows incorrect orientation',
      'Operator error',
      'Fixture does not prevent incorrect loading',
      'Work instruction unclear',
      'Poka-yoke bypassed'
    ],
    applicableProcesses: ['Manual Assembly', 'Automated Assembly'],
    defaultSeverity: 8,
    defaultOccurrence: 3,
    tags: ['assembly', 'orientation'],
    status: 'active',
  },

  // MATERIAL DEFECTS
  {
    category: 'material' as const,
    failureMode: 'Material degradation',
    genericEffect: 'Reduced mechanical properties, brittle parts',
    typicalCauses: [
      'Excessive drying temperature',
      'Excessive drying time',
      'Multiple regrind cycles',
      'Contaminated regrind',
      'Material expired/moisture absorbed'
    ],
    applicableProcesses: ['Injection Molding', 'Extrusion'],
    defaultSeverity: 8,
    defaultOccurrence: 2,
    tags: ['material', 'property'],
    status: 'active',
  },
  {
    category: 'material' as const,
    failureMode: 'Wrong material used',
    genericEffect: 'Part properties do not meet specification',
    typicalCauses: [
      'Material mis-labeled',
      'Operator loaded wrong hopper',
      'Supplier shipped wrong grade',
      'Material verification not performed',
      'Mix-up during changeover'
    ],
    applicableProcesses: ['All processes'],
    defaultSeverity: 9,
    defaultOccurrence: 1,
    tags: ['material', 'mix-up', 'critical'],
    status: 'active',
  },
  {
    category: 'material' as const,
    failureMode: 'Material contamination',
    genericEffect: 'Foreign material in part, property or cosmetic failure',
    typicalCauses: [
      'Unclean material handling',
      'Cross-contamination between materials',
      'Airborne debris',
      'Degraded material in system'
    ],
    applicableProcesses: ['Injection Molding', 'Extrusion'],
    defaultSeverity: 6,
    defaultOccurrence: 3,
    tags: ['material', 'contamination'],
    status: 'active',
  },

  // PROCESS DEFECTS
  {
    category: 'process' as const,
    failureMode: 'Burr/sharp edge',
    genericEffect: 'Cut hazard, fit interference',
    typicalCauses: [
      'Dull cutting tool',
      'Excessive feed rate',
      'Tool path not optimized',
      'Deburring operation skipped',
      'Material properties variation'
    ],
    applicableProcesses: ['Machining', 'Trimming', 'Degate', 'Punching'],
    defaultSeverity: 6,
    defaultOccurrence: 5,
    tags: ['machining', 'safety'],
    status: 'active',
  },
  {
    category: 'process' as const,
    failureMode: 'Defect escapes inspection',
    genericEffect: 'Nonconforming part shipped to customer',
    typicalCauses: [
      'Inspector fatigue',
      'Inadequate lighting',
      'Inspection criteria unclear',
      'Gage R&R inadequate',
      'Sampling plan insufficient',
      'Automated inspection bypassed'
    ],
    applicableProcesses: ['Visual Inspection', 'Dimensional Inspection', 'Functional Test'],
    defaultSeverity: 8,
    defaultOccurrence: 3,
    tags: ['inspection', 'detection'],
    status: 'active',
  },
  {
    category: 'process' as const,
    failureMode: 'Coating thickness out of spec',
    genericEffect: 'Insufficient corrosion protection or adhesion',
    typicalCauses: [
      'Application pressure variation',
      'Gun distance incorrect',
      'Material viscosity variation',
      'Spray pattern overlap insufficient',
      'Booth temperature/humidity out of range'
    ],
    applicableProcesses: ['Painting', 'Powder Coating', 'E-Coating'],
    defaultSeverity: 7,
    defaultOccurrence: 4,
    tags: ['coating', 'dimensional'],
    status: 'active',
  },
  {
    category: 'process' as const,
    failureMode: 'Heat treatment incorrect',
    genericEffect: 'Material properties not meeting specification',
    typicalCauses: [
      'Temperature out of specification',
      'Time at temperature incorrect',
      'Cooling rate incorrect',
      'Thermocouple failure',
      'Load placement in furnace incorrect'
    ],
    applicableProcesses: ['Heat Treatment', 'Annealing', 'Hardening'],
    defaultSeverity: 9,
    defaultOccurrence: 2,
    tags: ['heat-treat', 'property', 'critical'],
    industryStandard: 'CQI-9',
    status: 'active',
  },

  // CONTAMINATION
  {
    category: 'contamination' as const,
    failureMode: 'Damage during handling',
    genericEffect: 'Scratch, dent, or crack in finished part',
    typicalCauses: [
      'Improper packaging',
      'Parts stacked without dunnage',
      'Rough handling',
      'Container design inadequate',
      'Drop during transfer'
    ],
    applicableProcesses: ['Packing', 'Material Handling', 'Shipping'],
    defaultSeverity: 5,
    defaultOccurrence: 4,
    tags: ['handling', 'cosmetic'],
    status: 'active',
  },
  {
    category: 'contamination' as const,
    failureMode: 'Oil/grease contamination',
    genericEffect: 'Adhesion failure, cosmetic defect',
    typicalCauses: [
      'Equipment leaking',
      'Improper glove use',
      'Mold release overuse',
      'Cleaning solvent residue'
    ],
    applicableProcesses: ['All processes'],
    defaultSeverity: 5,
    defaultOccurrence: 3,
    tags: ['contamination', 'cleanliness'],
    status: 'active',
  },
  {
    category: 'contamination' as const,
    failureMode: 'Particulate contamination',
    genericEffect: 'Surface defects, functional failures in clean assemblies',
    typicalCauses: [
      'Airborne particles',
      'Packaging material shedding',
      'Operator not following clean procedures',
      'Inadequate cleanroom controls'
    ],
    applicableProcesses: ['Clean Assembly', 'Electronics Assembly'],
    defaultSeverity: 7,
    defaultOccurrence: 3,
    tags: ['contamination', 'cleanliness', 'critical'],
    status: 'active',
  },

  // FUNCTIONAL
  {
    category: 'functional' as const,
    failureMode: 'Leak at seal interface',
    genericEffect: 'Fluid leakage, customer concern, warranty claim',
    typicalCauses: [
      'Seal dimension out of tolerance',
      'Seal surface finish inadequate',
      'Contamination on sealing surface',
      'Assembly force insufficient',
      'Seal material incompatible with fluid'
    ],
    applicableProcesses: ['Assembly', 'Ultrasonic Weld', 'Adhesive Bonding'],
    defaultSeverity: 9,
    defaultOccurrence: 2,
    tags: ['functional', 'leak', 'critical'],
    industryStandard: 'Customer CSR',
    status: 'active',
  },
  {
    category: 'functional' as const,
    failureMode: 'Electrical connection failure',
    genericEffect: 'Circuit intermittent or open, function failure',
    typicalCauses: [
      'Terminal not fully seated',
      'Wire crimp inadequate',
      'Contamination on contacts',
      'Wrong wire gauge',
      'Connector damage during assembly'
    ],
    applicableProcesses: ['Wire Harness Assembly', 'Electronics Assembly'],
    defaultSeverity: 8,
    defaultOccurrence: 3,
    tags: ['electrical', 'functional', 'critical'],
    status: 'active',
  },
  {
    category: 'functional' as const,
    failureMode: 'Actuation force out of specification',
    genericEffect: 'User feel unacceptable, button/lever hard or easy to operate',
    typicalCauses: [
      'Spring rate variation',
      'Friction from contamination',
      'Dimensional variation in mechanism',
      'Lubricant missing or excessive'
    ],
    applicableProcesses: ['Assembly', 'Mechanism Assembly'],
    defaultSeverity: 6,
    defaultOccurrence: 4,
    tags: ['functional', 'haptics'],
    status: 'active',
  },

  // ENVIRONMENTAL
  {
    category: 'environmental' as const,
    failureMode: 'UV degradation',
    genericEffect: 'Part discoloration, brittleness over time',
    typicalCauses: [
      'UV stabilizer missing or insufficient',
      'Wrong material grade for exterior use',
      'Extended outdoor exposure during storage'
    ],
    applicableProcesses: ['Injection Molding', 'Extrusion'],
    defaultSeverity: 6,
    defaultOccurrence: 2,
    tags: ['environmental', 'durability'],
    status: 'active',
  },
  {
    category: 'environmental' as const,
    failureMode: 'Chemical attack/degradation',
    genericEffect: 'Part swelling, cracking, or dissolution',
    typicalCauses: [
      'Material not compatible with fluid',
      'Exposure to unexpected chemical',
      'Concentration higher than design basis'
    ],
    applicableProcesses: ['All processes'],
    defaultSeverity: 8,
    defaultOccurrence: 2,
    tags: ['environmental', 'chemical', 'critical'],
    status: 'active',
  },
  {
    category: 'environmental' as const,
    failureMode: 'Thermal expansion mismatch',
    genericEffect: 'Fit issues, stress cracking at temperature extremes',
    typicalCauses: [
      'Dissimilar materials with different CTE',
      'Design does not accommodate thermal growth',
      'Operating temperature exceeds design range'
    ],
    applicableProcesses: ['Assembly', 'Multi-material Assembly'],
    defaultSeverity: 7,
    defaultOccurrence: 3,
    tags: ['environmental', 'thermal'],
    status: 'active',
  },
];

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

      // ==========================================
      // COMPREHENSIVE PLASTIC INJECTION MOLDING PFMEA
      // AIAG-VDA 2019 Compliant - 5 Steps, 22 FMEA Rows
      // ==========================================
      console.log('  → Creating comprehensive Plastic Injection Molding PFMEA...');
      
      const [injectionMoldingComplete] = await tx.insert(processDef).values({
        name: 'Plastic Injection Molding - Complete PFMEA',
        rev: 'A',
        status: 'effective',
        effectiveFrom: new Date('2024-01-01'),
        changeNote: 'Comprehensive PFMEA per AIAG-VDA 2019 methodology',
        createdBy: seedUserId,
      }).returning().onConflictDoNothing();

      if (injectionMoldingComplete) {
        // Create 5 process steps
        const processSteps = await tx.insert(processStep).values([
          { processDefId: injectionMoldingComplete.id, seq: 10, name: 'Receiving', area: 'Incoming Materials' },
          { processDefId: injectionMoldingComplete.id, seq: 20, name: 'Injection Molding', area: 'Production' },
          { processDefId: injectionMoldingComplete.id, seq: 30, name: 'Minor Assembly', area: 'Assembly Area' },
          { processDefId: injectionMoldingComplete.id, seq: 40, name: 'Packing', area: 'Packaging' },
          { processDefId: injectionMoldingComplete.id, seq: 50, name: 'Shipping', area: 'Dock' },
        ]).returning().onConflictDoNothing();

        const step10 = processSteps.find(s => s.seq === 10);
        const step20 = processSteps.find(s => s.seq === 20);
        const step30 = processSteps.find(s => s.seq === 30);
        const step40 = processSteps.find(s => s.seq === 40);
        const step50 = processSteps.find(s => s.seq === 50);

        // STEP 10: RECEIVING - 3 FMEA Rows
        if (step10) {
          await tx.insert(fmeaTemplateRow).values([
            {
              processDefId: injectionMoldingComplete.id,
              stepId: step10.id,
              function: 'Accept and verify incoming resin material',
              requirement: 'Correct resin grade per specification, COC/COA present, moisture content < 0.02%',
              failureMode: 'Wrong resin grade received',
              effect: 'Part dimensional/mechanical property failure, customer return, safety risk',
              severity: 8,
              cause: 'Supplier shipping error, incorrect PO, label switch',
              occurrence: 3,
              preventionControls: ['Approved supplier list with quality agreement', 'PO review process with cross-check', 'Supplier certification program'],
              detectionControls: ['Incoming inspection: Verify label against PO', 'COA/COC review for grade verification', 'Sampling inspection (visual/density check)'],
              detection: 4,
              ap: 'M',
              specialFlag: false,
              notes: 'Consider adding resin grade verification via DSC or melt flow if history of issues',
            },
            {
              processDefId: injectionMoldingComplete.id,
              stepId: step10.id,
              function: 'Store resin in controlled environment',
              requirement: 'Temperature 60-80°F, humidity < 50%, FIFO rotation',
              failureMode: 'Resin contaminated or degraded during storage',
              effect: 'Parts with black specks, brittleness, dimensional instability',
              severity: 7,
              cause: 'Improper sealing of containers, excessive storage time, contamination from environment',
              occurrence: 4,
              preventionControls: ['Designated storage area with environmental controls', 'FIFO labeling system', 'Max storage time limits (6 months typical)', 'Sealed container storage SOP'],
              detectionControls: ['Visual inspection before use', 'Monthly storage audit', 'Expiration date review'],
              detection: 5,
              ap: 'M',
              specialFlag: false,
            },
            {
              processDefId: injectionMoldingComplete.id,
              stepId: step10.id,
              function: 'Receive and store production tooling',
              requirement: 'Mold undamaged, complete documentation, stored in climate control',
              failureMode: 'Mold damage during receipt/storage',
              effect: 'Part dimensional out of spec, flash, short shots',
              severity: 7,
              cause: 'Improper handling, inadequate storage, no inspection at receipt',
              occurrence: 3,
              preventionControls: ['Mold receiving inspection checklist', 'Climate-controlled storage (rust prevention)', 'Handling procedures with lifting equipment', 'Mold maintenance schedule'],
              detectionControls: ['Visual inspection at receipt', 'Photography of mold condition', 'Dimensional verification before first article'],
              detection: 4,
              ap: 'M',
              specialFlag: false,
            },
          ]).onConflictDoNothing();
        }

        // STEP 20: INJECTION MOLDING - 7 FMEA Rows
        if (step20) {
          await tx.insert(fmeaTemplateRow).values([
            {
              processDefId: injectionMoldingComplete.id,
              stepId: step20.id,
              function: 'Install and set up mold in press',
              requirement: 'Mold centered, clamp tonnage per specification, safety interlocks functional',
              failureMode: 'Mold improperly installed',
              effect: 'Press damage, mold damage, short shots, flash, safety hazard',
              severity: 8,
              cause: 'Incorrect clamp tonnage, misalignment, missing guide pins',
              occurrence: 3,
              preventionControls: ['Mold setup checklist', 'Verified clamp tonnage calculation', 'Setup approval by supervisor', 'Safety interlock verification'],
              detectionControls: ['Setup inspection checklist', 'First shot inspection', 'Press monitoring (tonnage, position sensors)'],
              detection: 3,
              ap: 'M',
              specialFlag: false,
            },
            {
              processDefId: injectionMoldingComplete.id,
              stepId: step20.id,
              function: 'Remove moisture from resin before molding',
              requirement: 'Moisture content < 0.02% (hygroscopic materials), drying temp/time per resin datasheet',
              failureMode: 'Inadequate drying (moisture remains)',
              effect: 'Parts with splay marks, silver streaks, reduced strength, brittle failure',
              severity: 7,
              cause: 'Insufficient drying time, incorrect temperature, dryer malfunction, hopper contamination',
              occurrence: 4,
              preventionControls: ['Dryer temperature control with alarm', 'Dwell time timer/monitoring', 'Dryer maintenance schedule', 'Desiccant replacement schedule', 'Moisture analyzer calibration'],
              detectionControls: ['Moisture analyzer test (random sampling)', 'Visual inspection for splay/silver streaks on first shots', 'Dryer temperature chart review'],
              detection: 5,
              ap: 'M',
              specialFlag: false,
              csrSymbol: '◆',
              notes: 'May warrant ◆ if appearance-critical for customer',
            },
            {
              processDefId: injectionMoldingComplete.id,
              stepId: step20.id,
              function: 'Form part to dimensional specification',
              requirement: 'All CTQ dimensions within print tolerance',
              failureMode: 'Dimension out of specification (short shot, flash, shrinkage variation)',
              effect: 'Part fit/function failure, assembly rejection, customer containment',
              severity: 8,
              cause: 'Insufficient pack pressure, incorrect pack time, temperature variation, mold wear',
              occurrence: 4,
              preventionControls: ['Process validation (DOE or scientific molding approach)', 'Pack pressure monitoring', 'Process parameter lock-out', 'Mold cooling temperature control', 'Preventive maintenance schedule'],
              detectionControls: ['First-piece inspection (all dimensions)', 'In-process sampling per control plan', 'CMM/gage R&R verified measurement', 'SPC with Cpk ≥ 1.33 target'],
              detection: 4,
              ap: 'M',
              specialFlag: true,
              csrSymbol: 'Ⓢ',
              notes: 'Critical dimension - requires SPC and capability study. AP=M per S×(O+D)=64.',
            },
            {
              processDefId: injectionMoldingComplete.id,
              stepId: step20.id,
              function: 'Process resin without thermal degradation',
              requirement: 'No burnt material, no black specks, tensile strength per spec',
              failureMode: 'Material degradation (burnt/degraded resin)',
              effect: 'Reduced part strength, cosmetic defects, part brittleness',
              severity: 7,
              cause: 'Excessive barrel temperature, long residence time, contamination',
              occurrence: 3,
              preventionControls: ['Temperature profile validation', 'Barrel temperature control with alarms', 'Residence time calculation and limit', 'Purge compound procedure', 'Nozzle heater band maintenance'],
              detectionControls: ['Visual inspection for discoloration', 'Burn marks/black specks inspection', 'Tensile test sampling (if destructive testing in CP)'],
              detection: 5,
              ap: 'M',
              specialFlag: false,
            },
            {
              processDefId: injectionMoldingComplete.id,
              stepId: step20.id,
              function: 'Eject part without damage',
              requirement: 'No ejector pin marks outside limits, no stress whitening, no cracks',
              failureMode: 'Ejection damage (cracks, stress marks, distortion)',
              effect: 'Part structural failure, appearance defect',
              severity: 6,
              cause: 'Insufficient cooling time, stuck part, ejector pin misalignment, inadequate draft',
              occurrence: 4,
              preventionControls: ['Cooling time validation', 'Ejector pin maintenance schedule', 'Mold release agent application (if approved)', 'Part temperature measurement at ejection'],
              detectionControls: ['Visual inspection 100% for stress marks/cracks', 'Automated vision system (if applicable)'],
              detection: 3,
              ap: 'L',
              specialFlag: false,
            },
            {
              processDefId: injectionMoldingComplete.id,
              stepId: step20.id,
              function: 'Prevent contamination during molding',
              requirement: 'No foreign material in parts',
              failureMode: 'Foreign material contamination',
              effect: 'Part failure, customer complaint, potential safety issue',
              severity: 7,
              cause: 'Unclean mold, environmental contamination, regrind contamination, cross-contamination',
              occurrence: 3,
              preventionControls: ['Mold cleaning procedure before setup', 'Clean room or controlled area for molding', 'Regrind usage limits and approval', 'Material handling SOP (segregation)', '5S workplace organization'],
              detectionControls: ['Visual inspection for foreign material', 'First-piece inspection after setup', 'In-process sampling'],
              detection: 4,
              ap: 'M',
              specialFlag: false,
            },
            {
              processDefId: injectionMoldingComplete.id,
              stepId: step20.id,
              function: 'Mold parts with correct color and surface finish',
              requirement: 'Color per approved standard, no flow lines, no sink marks',
              failureMode: 'Appearance defect (color off, flow lines, sink marks)',
              effect: 'Customer aesthetic rejection',
              severity: 5,
              cause: 'Incorrect colorant ratio, low injection speed, thick sections without adequate pack',
              occurrence: 5,
              preventionControls: ['Color masterbatch dosing system with verification', 'Color standard approval and retention', 'Gate location optimization', 'Wall thickness design review'],
              detectionControls: ['Color comparison to standard (first piece and periodic)', 'Visual inspection 100% for appearance defects', 'Lighting booth for consistent evaluation'],
              detection: 3,
              ap: 'L',
              specialFlag: false,
              csrSymbol: '◆',
              notes: 'May warrant ◆ if Class A surface',
            },
          ]).onConflictDoNothing();
        }

        // STEP 30: MINOR ASSEMBLY - 4 FMEA Rows
        if (step30) {
          await tx.insert(fmeaTemplateRow).values([
            {
              processDefId: injectionMoldingComplete.id,
              stepId: step30.id,
              function: 'Install secondary clips or inserts per specification',
              requirement: 'Clip fully seated, retention force per spec, no damage to part',
              failureMode: 'Clip not fully seated or missing',
              effect: 'Assembly failure at customer, clip falls out during service',
              severity: 7,
              cause: 'Operator error, inadequate fixturing, worn installation tool',
              occurrence: 4,
              preventionControls: ['Visual work instruction with go/no-go examples', 'Poka-yoke fixture (if feasible)', 'Tool calibration/maintenance', 'Operator training with competency verification'],
              detectionControls: ['100% visual inspection by operator', 'Random audit by quality (10 pcs/hour)', 'Go/no-go gage for clip seating'],
              detection: 4,
              ap: 'M',
              specialFlag: false,
              notes: 'Consider error-proofing with automated detection (e.g., height sensor)',
            },
            {
              processDefId: injectionMoldingComplete.id,
              stepId: step30.id,
              function: 'Orient part correctly for assembly operation',
              requirement: 'Correct side up, clips installed in correct location',
              failureMode: 'Part assembled backwards or with wrong orientation',
              effect: 'Non-functional assembly, customer return',
              severity: 8,
              cause: 'Lack of visual cues, operator distraction, no poka-yoke',
              occurrence: 3,
              preventionControls: ['Part orientation marks (if design allows)', 'Fixture with asymmetric design (poka-yoke)', 'Visual work instruction with color coding', 'Operator training'],
              detectionControls: ['Operator self-check per work instruction', 'End-of-line functional test (if applicable)', 'Random quality audit'],
              detection: 5,
              ap: 'H',
              specialFlag: true,
              notes: 'HIGH AP due to S=8 with moderate detection. Strong candidate for automation or error-proofing.',
            },
            {
              processDefId: injectionMoldingComplete.id,
              stepId: step30.id,
              function: 'Assemble components without causing damage',
              requirement: 'No scratches, cracks, or deformation',
              failureMode: 'Part damaged during assembly',
              effect: 'Appearance defect, potential structural weakness',
              severity: 6,
              cause: 'Excessive force, sharp edges on fixture, operator technique',
              occurrence: 4,
              preventionControls: ['Tool/fixture design with rounded edges', 'Force limits established and monitored', 'Operator training on proper technique', 'Tool maintenance schedule'],
              detectionControls: ['100% visual inspection after assembly', 'Random sampling with detailed inspection'],
              detection: 3,
              ap: 'L',
              specialFlag: false,
            },
            {
              processDefId: injectionMoldingComplete.id,
              stepId: step30.id,
              function: 'Use correct components for each assembly',
              requirement: 'Only components matching the part number/customer order',
              failureMode: 'Wrong component used in assembly',
              effect: 'Functional failure, customer rejection, potential recall',
              severity: 9,
              cause: 'Similar-looking parts not segregated, no visual distinction, operator error',
              occurrence: 2,
              preventionControls: ['Physical segregation of different part numbers', 'Kanbans with part identification', 'Color coding or clear labeling', 'Verified changeover procedure', 'Single-part-number production runs (batch strategy)'],
              detectionControls: ['First-piece verification after changeover', 'Random audit with part number verification', 'Component traceability (if bar-coded)'],
              detection: 4,
              ap: 'H',
              specialFlag: true,
              csrSymbol: 'Ⓢ',
              notes: 'HIGH AP due to severity. Must have robust prevention and detection.',
            },
          ]).onConflictDoNothing();
        }

        // STEP 40: PACKING - 4 FMEA Rows
        if (step40) {
          await tx.insert(fmeaTemplateRow).values([
            {
              processDefId: injectionMoldingComplete.id,
              stepId: step40.id,
              function: 'Pack correct quantity per container',
              requirement: 'Quantity matches label and customer requirement',
              failureMode: 'Incorrect quantity (over/under count)',
              effect: 'Customer line down (shortage), inventory discrepancy, customer dissatisfaction',
              severity: 6,
              cause: 'Manual counting error, distraction, no verification',
              occurrence: 5,
              preventionControls: ['Counting aids (fixtures with cavities)', 'Scale weighing with tolerance limits', 'Barcode scanning system', 'Operator training'],
              detectionControls: ['Operator recount or verification', 'Random weight check audit', 'Second operator verification (for critical quantities)'],
              detection: 5,
              ap: 'M',
              specialFlag: false,
            },
            {
              processDefId: injectionMoldingComplete.id,
              stepId: step40.id,
              function: 'Protect parts during packaging',
              requirement: 'No scratches, dents, or damage to parts during packing',
              failureMode: 'Part damaged during packing',
              effect: 'Customer appearance rejection, functional impact (if damage is severe)',
              severity: 5,
              cause: 'Improper handling, inadequate protection (foam/dividers), parts contact each other',
              occurrence: 4,
              preventionControls: ['Packaging validation (drop test, vibration test)', 'Foam dividers or individual wrapping', 'Operator training on handling', 'Packaging design review'],
              detectionControls: ['Visual inspection during packing', 'Final audit before shipping'],
              detection: 4,
              ap: 'L',
              specialFlag: false,
            },
            {
              processDefId: injectionMoldingComplete.id,
              stepId: step40.id,
              function: 'Apply correct label to container',
              requirement: 'Label matches part number, quantity, lot traceability, customer PO',
              failureMode: 'Wrong label or missing information',
              effect: 'Wrong parts delivered to customer, traceability lost, customer line down',
              severity: 8,
              cause: 'Label printer error, operator selects wrong label template, manual entry error',
              occurrence: 3,
              preventionControls: ['Automated label printing from ERP/MES', 'Label template lock-out (supervisor approval for changes)', 'First-label verification procedure', 'Barcode verification system'],
              detectionControls: ['Operator scan verification before application', 'Visual verification of label information', 'Random audit scan by quality'],
              detection: 3,
              ap: 'M',
              specialFlag: false,
              notes: 'Consider automated label verification system',
            },
            {
              processDefId: injectionMoldingComplete.id,
              stepId: step40.id,
              function: 'Maintain traceability to production lot',
              requirement: 'Lot number on label allows traceability to production date, shift, resin lot',
              failureMode: 'Traceability lost or incorrect',
              effect: 'Cannot execute recall effectively, customer audit finding',
              severity: 7,
              cause: 'Lot number not recorded, manual entry error, system not updated',
              occurrence: 3,
              preventionControls: ['Automated lot assignment from MES', 'Lot number generation logic (date/shift code)', 'Lot number verification checklist', 'Electronic records (eliminate paper)'],
              detectionControls: ['Lot number scan verification', 'Traceability audit (random sample trace-back)'],
              detection: 4,
              ap: 'M',
              specialFlag: false,
              notes: 'IATF requirement - must demonstrate traceability',
            },
          ]).onConflictDoNothing();
        }

        // STEP 50: SHIPPING - 4 FMEA Rows
        if (step50) {
          await tx.insert(fmeaTemplateRow).values([
            {
              processDefId: injectionMoldingComplete.id,
              stepId: step50.id,
              function: 'Ship parts to correct customer destination',
              requirement: 'Parts delivered to correct address per customer PO',
              failureMode: 'Parts shipped to wrong customer',
              effect: 'Customer line down, major customer complaint, competitor receives parts',
              severity: 9,
              cause: 'Wrong shipping label, carrier error, dock personnel error',
              occurrence: 2,
              preventionControls: ['Automated shipping label from ERP (linked to customer PO)', 'Address verification before printing label', 'Staging area segregation by customer', 'Shipping checklist with PO verification'],
              detectionControls: ['Shipping label verification before loading', 'Barcode scan confirmation', 'BOL review by supervisor'],
              detection: 3,
              ap: 'H',
              specialFlag: true,
              csrSymbol: 'Ⓢ',
              notes: 'HIGH AP due to extreme severity. Consider customer-specific shipping procedures.',
            },
            {
              processDefId: injectionMoldingComplete.id,
              stepId: step50.id,
              function: 'Provide accurate shipping documents',
              requirement: 'BOL, packing list, COC match actual shipment',
              failureMode: 'Document errors (quantity mismatch, missing COC)',
              effect: 'Customs delay, customer receiving delays, audit finding',
              severity: 6,
              cause: 'Manual entry error, document not updated, printer malfunction',
              occurrence: 4,
              preventionControls: ['Electronic document generation from ERP', 'Document review checklist', 'COC auto-generation from QC data', 'Supervisor approval before release'],
              detectionControls: ['Document review before shipment', 'Random audit of document accuracy'],
              detection: 4,
              ap: 'M',
              specialFlag: false,
            },
            {
              processDefId: injectionMoldingComplete.id,
              stepId: step50.id,
              function: 'Protect parts during transit',
              requirement: 'Parts arrive at customer undamaged',
              failureMode: 'Damage during shipment',
              effect: 'Customer rejection, return cost, schedule impact',
              severity: 6,
              cause: 'Inadequate packaging, improper loading, carrier handling',
              occurrence: 3,
              preventionControls: ['Packaging validation (ISTA testing if required)', 'Pallet load patterns with stretch wrap', 'Loading procedures (heavier items on bottom)', 'Carrier quality requirements'],
              detectionControls: ['Final visual inspection before loading', 'Customer feedback on receipt condition'],
              detection: 6,
              ap: 'M',
              specialFlag: false,
            },
            {
              processDefId: injectionMoldingComplete.id,
              stepId: step50.id,
              function: 'Maintain parts within environmental limits during shipping',
              requirement: 'Parts not exposed to extreme temperature or humidity',
              failureMode: 'Parts exposed to excessive heat/cold/moisture',
              effect: 'Part dimensional change, material property degradation',
              severity: 7,
              cause: 'No climate control in trailer, summer/winter extremes, shipment delays',
              occurrence: 2,
              preventionControls: ['Climate-controlled trailer requirements (if needed)', 'Expedited shipping for sensitive materials', 'Packaging with moisture barrier', 'Carrier selection with environmental controls'],
              detectionControls: ['Temperature data loggers (if critical)', 'Customer inspection at receipt'],
              detection: 7,
              ap: 'M',
              specialFlag: false,
            },
          ]).onConflictDoNothing();
        }

        console.log('  → Plastic Injection Molding PFMEA created with 5 steps and 22 FMEA rows');
      }

      // Seed Failure Modes Library
      console.log('  → Creating Failure Modes Library...');
      for (const fm of AUTOMOTIVE_FAILURE_MODES) {
        await tx.insert(failureModesLibrary).values(fm).onConflictDoNothing();
      }
      console.log(`  → Seeded ${AUTOMOTIVE_FAILURE_MODES.length} failure modes`);
    });

    console.log('✅ Seed complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
