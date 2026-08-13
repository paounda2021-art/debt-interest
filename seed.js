const { initDb, insertCase } = require('./database');

async function seed() {
  await initDb();
  console.log('Seeding 20 test cases...');

  const preLitCases = [
    {
      category: 'prelit',
      preLitigationDebtor: 'บริษัท สมาร์ทรีเทล จำกัด',
      defendantName: 'บริษัท สมาร์ทรีเทล จำกัด',
      plaintiffName: 'บริษัท พัฒนาอสังหาริมทรัพย์ จำกัด',
      preLitigationDebt: 180000,
      principalAmount: 180000,
      preLitigationRate: 7.5,
      rentalPenaltyType: 'daily',
      rentalPenaltyFee: 500,
      defaultDate: '2024-01-01',
      filingDate: '2024-06-01',
      preLitigationNotes: 'ค้างชำระค่าเช่าพื้นที่ร้านค้า 5 งวด + ค่าปรับผิดนัดรายวันสัญญาข้อ 4',
      interestStages: [{ startDate: '2024-01-01', endDate: '2024-06-01', rate: 7.5 }],
      partialPayments: []
    },
    {
      category: 'prelit',
      preLitigationDebtor: 'นายอนันต์ มุ่งมั่น',
      defendantName: 'นายอนันต์ มุ่งมั่น',
      plaintiffName: 'บริษัท สยามเช่าซื้อ จำกัด',
      preLitigationDebt: 45000,
      principalAmount: 45000,
      preLitigationRate: 15.0,
      rentalPenaltyType: 'monthly',
      rentalPenaltyFee: 3000,
      defaultDate: '2023-09-15',
      filingDate: '2024-03-15',
      preLitigationNotes: 'เช่าอาคารพานิชย์ค้างชำระค่าเช่า 3 งวด',
      interestStages: [{ startDate: '2023-09-15', endDate: '2024-03-15', rate: 15.0 }],
      partialPayments: []
    },
    {
      category: 'prelit',
      preLitigationDebtor: 'นางสาวกนกวรรณ รัตนโชติ',
      defendantName: 'นางสาวกนกวรรณ รัตนโชติ',
      plaintiffName: 'คุณประเสริฐ เจ้าของอาคาร',
      preLitigationDebt: 120000,
      principalAmount: 120000,
      preLitigationRate: 7.5,
      rentalPenaltyType: 'flat',
      rentalPenaltyFee: 15000,
      defaultDate: '2023-11-01',
      filingDate: '2024-05-01',
      preLitigationNotes: 'สัญญาเช่าคอนโดมีเนียมค้างชำระ + ค่าเสียหายทรัพย์สิน',
      interestStages: [{ startDate: '2023-11-01', endDate: '2024-05-01', rate: 7.5 }],
      partialPayments: []
    },
    {
      category: 'prelit',
      preLitigationDebtor: 'ห้างหุ้นส่วนจำกัด สยามโลจิสติกส์',
      defendantName: 'ห้างหุ้นส่วนจำกัด สยามโลจิสติกส์',
      plaintiffName: 'บริษัท นิคมอุตสาหกรรม จำกัด',
      preLitigationDebt: 350000,
      principalAmount: 350000,
      preLitigationRate: 5.0,
      rentalPenaltyType: 'daily',
      rentalPenaltyFee: 1000,
      defaultDate: '2023-06-01',
      filingDate: '2024-01-01',
      preLitigationNotes: 'ค้างค่าเช่าโกดังคลังสินค้าสัญญา 2 ปี',
      interestStages: [{ startDate: '2023-06-01', endDate: '2024-01-01', rate: 5.0 }],
      partialPayments: []
    },
    {
      category: 'prelit',
      preLitigationDebtor: 'นายวีระศักดิ์ บุญประเสริฐ',
      defendantName: 'นายวีระศักดิ์ บุญประเสริฐ',
      plaintiffName: 'บริษัท ทาวเวอร์บริการ จำกัด',
      preLitigationDebt: 78000,
      principalAmount: 78000,
      preLitigationRate: 7.5,
      rentalPenaltyType: 'daily',
      rentalPenaltyFee: 300,
      defaultDate: '2024-02-01',
      filingDate: '2024-07-01',
      preLitigationNotes: 'ค่าเช่าสำนักงานพร้อมค่าบริการส่วนกลาง',
      interestStages: [{ startDate: '2024-02-01', endDate: '2024-07-01', rate: 7.5 }],
      partialPayments: []
    },
    {
      category: 'prelit',
      preLitigationDebtor: 'นางศิริพร เจริญสุข',
      defendantName: 'นางศิริพร เจริญสุข',
      plaintiffName: 'ตลาดสดสยามการค้า',
      preLitigationDebt: 60000,
      principalAmount: 60000,
      preLitigationRate: 15.0,
      rentalPenaltyType: 'monthly',
      rentalPenaltyFee: 2500,
      defaultDate: '2023-10-01',
      filingDate: '2024-04-01',
      preLitigationNotes: 'ค่าเช่าแผงค้าในตลาดสดค้าง 4 เดือน',
      interestStages: [{ startDate: '2023-10-01', endDate: '2024-04-01', rate: 15.0 }],
      partialPayments: []
    },
    {
      category: 'prelit',
      preLitigationDebtor: 'บริษัท ไทยฟู้ดส์แอนด์เบเวอเรจ จำกัด',
      defendantName: 'บริษัท ไทยฟู้ดส์แอนด์เบเวอเรจ จำกัด',
      plaintiffName: 'บริษัท อสังหาอุตสาหกรรม จำกัด',
      preLitigationDebt: 520000,
      principalAmount: 520000,
      preLitigationRate: 7.5,
      rentalPenaltyType: 'flat',
      rentalPenaltyFee: 50000,
      defaultDate: '2023-05-01',
      filingDate: '2024-02-01',
      preLitigationNotes: 'ค้างชำระค่าเช่าโรงงานและเครื่องจักร',
      interestStages: [{ startDate: '2023-05-01', endDate: '2024-02-01', rate: 7.5 }],
      partialPayments: []
    },
    {
      category: 'prelit',
      preLitigationDebtor: 'นายธีรเดช วงศ์สว่าง',
      defendantName: 'นายธีรเดช วงศ์สว่าง',
      plaintiffName: 'คุณอนันต์ เจ้าของบ้าน',
      preLitigationDebt: 95000,
      principalAmount: 95000,
      preLitigationRate: 7.5,
      rentalPenaltyType: 'daily',
      rentalPenaltyFee: 400,
      defaultDate: '2023-12-01',
      filingDate: '2024-06-01',
      preLitigationNotes: 'เช่าบ้านพักอาศัยพร้อมที่ดินค้างชำระ 5 งวด',
      interestStages: [{ startDate: '2023-12-01', endDate: '2024-06-01', rate: 7.5 }],
      partialPayments: []
    },
    {
      category: 'prelit',
      preLitigationDebtor: 'นางสาวนภาพร ไพศาล',
      defendantName: 'นางสาวนภาพร ไพศาล',
      plaintiffName: 'หอพักสตรีวิไล',
      preLitigationDebt: 38000,
      principalAmount: 38000,
      preLitigationRate: 5.0,
      rentalPenaltyType: 'flat',
      rentalPenaltyFee: 5000,
      defaultDate: '2024-03-01',
      filingDate: '2024-08-01',
      preLitigationNotes: 'ค้างชำระค่าเช่าหอพักนักศึกษา',
      interestStages: [{ startDate: '2024-03-01', endDate: '2024-08-01', rate: 5.0 }],
      partialPayments: []
    },
    {
      category: 'prelit',
      preLitigationDebtor: 'บริษัท เอ็นเทอร์ไพรส์เทคโนโลยี จำกัด',
      defendantName: 'บริษัท เอ็นเทอร์ไพรส์เทคโนโลยี จำกัด',
      plaintiffName: 'บริษัท ไฮเทคโซลูชั่น จำกัด',
      preLitigationDebt: 290000,
      principalAmount: 290000,
      preLitigationRate: 7.5,
      rentalPenaltyType: 'daily',
      rentalPenaltyFee: 800,
      defaultDate: '2023-08-01',
      filingDate: '2024-02-01',
      preLitigationNotes: 'สัญญาเช่าเครื่องเซิร์ฟเวอร์และอุปกรณ์ไอที',
      interestStages: [{ startDate: '2023-08-01', endDate: '2024-02-01', rate: 7.5 }],
      partialPayments: []
    }
  ];

  const courtCases = [
    {
      category: 'court',
      caseBlackNo: 'พ. 101/2565',
      caseRedNo: 'พ. 505/2565',
      plaintiffName: 'ธนาคารพัฒนาการพาณิชย์ จำกัด',
      defendantName: 'นายสมชาย ใจดี',
      preLitigationDebtor: 'นายสมชาย ใจดี',
      principalAmount: 250000,
      defaultDate: '2020-01-01',
      filingDate: '2021-01-01',
      judgmentDate: '2021-06-01',
      courtFeeAwarded: 11000,
      interestStages: [
        { startDate: '2020-01-01', endDate: '2021-04-10', rate: 7.5, label: 'ดอกเบี้ยผิดนัดเดิม 7.5%' },
        { startDate: '2021-04-11', endDate: '', rate: 5.0, label: 'ดอกเบี้ยตาม พ.ร.ก. 5.0%' }
      ],
      partialPayments: [
        { date: '2021-08-15', amount: 20000, note: 'ผ่อนชำระงวดที่ 1' },
        { date: '2022-02-10', amount: 35000, note: 'ผ่อนชำระงวดที่ 2' }
      ]
    },
    {
      category: 'court',
      caseBlackNo: 'ผบ. 888/2565',
      caseRedNo: 'ผบ. 999/2565',
      plaintiffName: 'บริษัท เงินทุนหลักทรัพย์สยาม จำกัด',
      defendantName: 'นางสาวสมหญิง สุขใจ',
      preLitigationDebtor: 'นางสาวสมหญิง สุขใจ',
      principalAmount: 180000,
      defaultDate: '2019-05-15',
      filingDate: '2020-05-15',
      judgmentDate: '2020-11-01',
      courtFeeAwarded: 8500,
      interestStages: [
        { startDate: '2019-05-15', endDate: '2021-04-10', rate: 7.5, label: 'ดอกเบี้ยเดิม 7.5%' },
        { startDate: '2021-04-11', endDate: '', rate: 5.0, label: 'ดอกเบี้ยใหม่ 5.0%' }
      ],
      partialPayments: [
        { date: '2021-01-10', amount: 15000, note: 'ชำระหลังพิพากษา' }
      ]
    },
    {
      category: 'court',
      caseBlackNo: 'พ. 222/2566',
      caseRedNo: 'พ. 777/2566',
      plaintiffName: 'บริษัท คอนกรีตผสมเสร็จ จำกัด',
      defendantName: 'บริษัท ก่อสร้างไทยพัฒนา จำกัด',
      preLitigationDebtor: 'บริษัท ก่อสร้างไทยพัฒนา จำกัด',
      principalAmount: 1200000,
      defaultDate: '2021-03-01',
      filingDate: '2022-03-01',
      judgmentDate: '2022-09-15',
      courtFeeAwarded: 35000,
      interestStages: [
        { startDate: '2021-03-01', endDate: '2021-04-10', rate: 7.5 },
        { startDate: '2021-04-11', endDate: '', rate: 5.0 }
      ],
      partialPayments: [
        { date: '2023-01-15', amount: 200000, note: 'ผ่อนชำระงวดใหญ่ 1' },
        { date: '2023-07-20', amount: 150000, note: 'ผ่อนชำระงวดใหญ่ 2' }
      ]
    },
    {
      category: 'court',
      caseBlackNo: 'ผบ. 333/2564',
      caseRedNo: 'ผบ. 444/2564',
      plaintiffName: 'บริษัท บริหารสินทรัพย์ กรุงเทพ จำกัด',
      defendantName: 'นายพิเชษฐ์ เด่นดวง',
      preLitigationDebtor: 'นายพิเชษฐ์ เด่นดวง',
      principalAmount: 95000,
      defaultDate: '2018-10-01',
      filingDate: '2019-10-01',
      judgmentDate: '2020-03-01',
      courtFeeAwarded: 4500,
      interestStages: [
        { startDate: '2018-10-01', endDate: '2021-04-10', rate: 7.5 },
        { startDate: '2021-04-11', endDate: '', rate: 5.0 }
      ],
      partialPayments: [
        { date: '2020-05-01', amount: 10000, note: 'งวดที่ 1' },
        { date: '2020-11-01', amount: 10000, note: 'งวดที่ 2' },
        { date: '2021-05-01', amount: 10000, note: 'งวดที่ 3' }
      ]
    },
    {
      category: 'court',
      caseBlackNo: 'ผบ. 112/2566',
      caseRedNo: 'ผบ. 334/2566',
      plaintiffName: 'บริษัท ลีสซิ่งการเกษตร จำกัด',
      defendantName: 'นางอุมาพร มณีรัตน์',
      preLitigationDebtor: 'นางอุมาพร มณีรัตน์',
      principalAmount: 320000,
      defaultDate: '2021-08-01',
      filingDate: '2022-08-01',
      judgmentDate: '2023-02-14',
      courtFeeAwarded: 12000,
      interestStages: [
        { startDate: '2021-08-01', endDate: '', rate: 5.0 }
      ],
      partialPayments: [
        { date: '2023-05-10', amount: 40000, note: 'ผ่อนชำระงวดที่ 1' }
      ]
    },
    {
      category: 'court',
      caseBlackNo: 'พ. 555/2565',
      caseRedNo: 'พ. 888/2565',
      plaintiffName: 'สหกรณ์ออมทรัพย์ครู จำกัด',
      defendantName: 'นายกิตติศักดิ์ ชัยชนะ',
      preLitigationDebtor: 'นายกิตติศักดิ์ ชัยชนะ',
      principalAmount: 500000,
      defaultDate: '2020-06-01',
      filingDate: '2021-06-01',
      judgmentDate: '2021-12-01',
      courtFeeAwarded: 18000,
      interestStages: [
        { startDate: '2020-06-01', endDate: '2021-04-10', rate: 7.5 },
        { startDate: '2021-04-11', endDate: '', rate: 5.0 }
      ],
      partialPayments: [
        { date: '2022-03-01', amount: 50000, note: 'งวดที่ 1' },
        { date: '2022-09-01', amount: 50000, note: 'งวดที่ 2' }
      ]
    },
    {
      category: 'court',
      caseBlackNo: 'พ. 404/2566',
      caseRedNo: 'พ. 909/2566',
      plaintiffName: 'บริษัท ปิโตรเลียมการค้า จำกัด',
      defendantName: 'ห้างหุ้นส่วนจำกัด รัตนบริการ',
      preLitigationDebtor: 'ห้างหุ้นส่วนจำกัด รัตนบริการ',
      principalAmount: 680000,
      defaultDate: '2021-11-01',
      filingDate: '2022-11-01',
      judgmentDate: '2023-04-15',
      courtFeeAwarded: 22000,
      interestStages: [
        { startDate: '2021-11-01', endDate: '', rate: 5.0 }
      ],
      partialPayments: [
        { date: '2023-08-01', amount: 100000, note: 'ชำระงวดแรก' }
      ]
    },
    {
      category: 'court',
      caseBlackNo: 'ผบ. 707/2564',
      caseRedNo: 'ผบ. 808/2564',
      plaintiffName: 'ธนาคารกรุงไทยสยาม จำกัด',
      defendantName: 'นายพงศธร สุวรรณโชติ',
      preLitigationDebtor: 'นายพงศธร สุวรรณโชติ',
      principalAmount: 140000,
      defaultDate: '2019-01-01',
      filingDate: '2020-01-01',
      judgmentDate: '2020-07-01',
      courtFeeAwarded: 6000,
      interestStages: [
        { startDate: '2019-01-01', endDate: '2021-04-10', rate: 7.5 },
        { startDate: '2021-04-11', endDate: '', rate: 5.0 }
      ],
      partialPayments: [
        { date: '2020-10-01', amount: 20000, note: 'งวดที่ 1' },
        { date: '2021-04-01', amount: 20000, note: 'งวดที่ 2' }
      ]
    },
    {
      category: 'court',
      caseBlackNo: 'ผบ. 234/2566',
      caseRedNo: 'ผบ. 567/2566',
      plaintiffName: 'บริษัท แคปปิตอลไฟแนนซ์ จำกัด',
      defendantName: 'นางสาวชลธิชา บุญช่วย',
      preLitigationDebtor: 'นางสาวชลธิชา บุญช่วย',
      principalAmount: 210000,
      defaultDate: '2022-01-15',
      filingDate: '2023-01-15',
      judgmentDate: '2023-07-01',
      courtFeeAwarded: 9000,
      interestStages: [
        { startDate: '2022-01-15', endDate: '', rate: 5.0 }
      ],
      partialPayments: [
        { date: '2023-10-15', amount: 30000, note: 'ชำระตามยอดประนีประนอม' }
      ]
    },
    {
      category: 'court',
      caseBlackNo: 'พ. 999/2565',
      caseRedNo: 'พ. 1111/2565',
      plaintiffName: 'บริษัท ชิปปิ้งโลจิสติกส์ จำกัด',
      defendantName: 'บริษัท เทรดดิ้งอินเตอร์เนชั่นแนล จำกัด',
      preLitigationDebtor: 'บริษัท เทรดดิ้งอินเตอร์เนชั่นแนล จำกัด',
      principalAmount: 850000,
      defaultDate: '2020-09-01',
      filingDate: '2021-09-01',
      judgmentDate: '2022-03-01',
      courtFeeAwarded: 28000,
      interestStages: [
        { startDate: '2020-09-01', endDate: '2021-04-10', rate: 7.5 },
        { startDate: '2021-04-11', endDate: '', rate: 5.0 }
      ],
      partialPayments: [
        { date: '2022-06-01', amount: 150000, note: 'ผ่อนงวดที่ 1' },
        { date: '2022-12-01', amount: 150000, note: 'ผ่อนงวดที่ 2' }
      ]
    }
  ];

  [...preLitCases, ...courtCases].forEach(c => {
    insertCase(c);
  });

  console.log('Successfully inserted 10 Pre-Litigation and 10 Court Case records!');
}

seed();
