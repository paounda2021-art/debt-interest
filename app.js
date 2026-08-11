/**
 * Court Interest Legal Calculator (ระบบคิดดอกเบี้ยตามคำสั่งฟ้อง/คำพิพากษาศาล)
 * Supports Thai Civil and Commercial Code Sec 7, 224, 329 & 2021 Amendment (พ.ร.ก. 2564)
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. DOM Elements (Declared FIRST to avoid Temporal Dead Zone)
  const courtForm = document.getElementById('courtForm');
  const btnAddInterestStage = document.getElementById('btnAddInterestStage');
  const btnAddPayment = document.getElementById('btnAddPayment');
  const interestStagesContainer = document.getElementById('interestStagesContainer');
  const paymentsContainer = document.getElementById('paymentsContainer');
  const presetButtons = document.querySelectorAll('.preset-btn');
  const btnThemeToggle = document.getElementById('btnThemeToggle');
  const btnPrintReport = document.getElementById('btnPrintReport');
  const btnExportJson = document.getElementById('btnExportJson');
  const btnSampleCase1 = document.getElementById('btnSampleCase1');
  const btnSampleCase2 = document.getElementById('btnSampleCase2');

  // 2. Initial State
  let currentPreset = 'legal2021';
  let interestStages = [];
  let partialPayments = [];

  // Lucide Icons Init
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Set default target date to Today
  const todayStr = formatDateIso(new Date());
  const calcTargetInput = document.getElementById('calcTargetDate');
  if (calcTargetInput && !calcTargetInput.value) {
    calcTargetInput.value = todayStr;
  }

  // 3. Helper Functions
  function parseDateLocal(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }

  function formatDateIso(d) {
    if (!d || isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function diffDays(d1, d2) {
    const timeDiff = d2.getTime() - d1.getTime();
    return Math.max(0, Math.round(timeDiff / (1000 * 3600 * 24)));
  }

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  function formatDateThai(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const yearBE = parseInt(parts[0]) + 543;
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const monthName = months[parseInt(parts[1]) - 1];
    return `${parseInt(parts[2])} ${monthName} ${yearBE}`;
  }

  function formatCurrency(val) {
    return (val || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ฿';
  }

  function getActiveRateForDate(dateStr, stages) {
    for (let stg of stages) {
      if (stg.startDate && dateStr >= stg.startDate) {
        if (!stg.endDate || dateStr <= stg.endDate) {
          return stg.rate;
        }
      }
    }
    return stages[stages.length - 1]?.rate || 5.0;
  }

  // 4. UI Rendering Functions
  function applyPreset(preset) {
    const defaultDate = document.getElementById('defaultDate')?.value || '2020-01-01';
    const filingDate = document.getElementById('filingDate')?.value || '2021-01-01';
    const legalChangeDate = '2021-04-11';

    if (preset === 'legal2021') {
      interestStages = [
        { startDate: defaultDate, endDate: '2021-04-10', rate: 7.5, label: 'ดอกเบี้ยผิดนัดก่อน 11 เม.ย. 64 (7.5%)' },
        { startDate: legalChangeDate, endDate: '', rate: 5.0, label: 'ดอกเบี้ยผิดนัดหลัง 11 เม.ย. 64 (5.0%)' }
      ];
    } else if (preset === 'contract15') {
      interestStages = [
        { startDate: defaultDate, endDate: '', rate: 15.0, label: 'อัตราดอกเบี้ยตามสัญญา (15% ต่อปี)' }
      ];
    } else if (preset === 'contractAndLegal') {
      interestStages = [
        { startDate: defaultDate, endDate: filingDate, rate: 15.0, label: 'อัตราตามสัญญาถึงวันฟ้อง (15%)' },
        { startDate: filingDate, endDate: '2021-04-10', rate: 7.5, label: 'ดอกเบี้ยผิดนัดเดิม (7.5%)' },
        { startDate: legalChangeDate, endDate: '', rate: 5.0, label: 'ดอกเบี้ยผิดนัดใหม่ (5.0%)' }
      ];
    }

    renderInterestStages();
  }

  function renderInterestStages() {
    if (!interestStagesContainer) return;
    interestStagesContainer.innerHTML = '';
    interestStages.forEach((stage, idx) => {
      const item = document.createElement('div');
      item.className = 'stage-item';
      item.innerHTML = `
        <div class="stage-item-header">
          <span>ช่วงที่ ${idx + 1}: ${stage.label || 'อัตราดอกเบี้ย'}</span>
          ${interestStages.length > 1 ? `<button type="button" class="btn-danger-sm remove-stage" data-idx="${idx}">ลบ</button>` : ''}
        </div>
        <div class="form-row">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">ตั้งแต่วันที่</label>
            <input type="date" class="form-control stage-start" data-idx="${idx}" value="${stage.startDate}">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">ถึงวันที่ (เว้นว่าง = ถึงวันคำนวณ)</label>
            <input type="date" class="form-control stage-end" data-idx="${idx}" value="${stage.endDate || ''}">
          </div>
        </div>
        <div class="form-group" style="margin-top:8px; margin-bottom:0;">
          <label class="form-label">อัตราดอกเบี้ย (% ต่อปี)</label>
          <input type="number" step="0.01" class="form-control stage-rate" data-idx="${idx}" value="${stage.rate}">
        </div>
      `;
      interestStagesContainer.appendChild(item);
    });

    interestStagesContainer.querySelectorAll('.stage-start').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const idx = e.target.getAttribute('data-idx');
        interestStages[idx].startDate = e.target.value;
        calculateAndRender();
      });
    });

    interestStagesContainer.querySelectorAll('.stage-end').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const idx = e.target.getAttribute('data-idx');
        interestStages[idx].endDate = e.target.value;
        calculateAndRender();
      });
    });

    interestStagesContainer.querySelectorAll('.stage-rate').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const idx = e.target.getAttribute('data-idx');
        interestStages[idx].rate = parseFloat(e.target.value) || 0;
        calculateAndRender();
      });
    });

    interestStagesContainer.querySelectorAll('.remove-stage').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        interestStages.splice(idx, 1);
        renderInterestStages();
        calculateAndRender();
      });
    });
  }

  function renderPayments() {
    if (!paymentsContainer) return;
    paymentsContainer.innerHTML = '';
    partialPayments.forEach((pmt, idx) => {
      const item = document.createElement('div');
      item.className = 'stage-item';
      item.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      item.innerHTML = `
        <div class="stage-item-header" style="color: var(--accent-emerald);">
          <span>การชำระเงินที่ ${idx + 1} (${pmt.note || ''})</span>
          <button type="button" class="btn-danger-sm remove-pmt" data-idx="${idx}">ลบ</button>
        </div>
        <div class="form-row">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">วันที่ชำระเงิน</label>
            <input type="date" class="form-control pmt-date" data-idx="${idx}" value="${pmt.date}">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">จำนวนเงินที่ชำระ (บาท)</label>
            <input type="number" step="100" class="form-control pmt-amount" data-idx="${idx}" value="${pmt.amount}">
          </div>
        </div>
      `;
      paymentsContainer.appendChild(item);
    });

    paymentsContainer.querySelectorAll('.pmt-date').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const idx = e.target.getAttribute('data-idx');
        partialPayments[idx].date = e.target.value;
        calculateAndRender();
      });
    });

    paymentsContainer.querySelectorAll('.pmt-amount').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const idx = e.target.getAttribute('data-idx');
        partialPayments[idx].amount = parseFloat(e.target.value) || 0;
        calculateAndRender();
      });
    });

    paymentsContainer.querySelectorAll('.remove-pmt').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        partialPayments.splice(idx, 1);
        renderPayments();
        calculateAndRender();
      });
    });
  }

  function renderSummary(totalDebt, remainingPrincipal, totalInterest, totalFees, totalPaid, totalDays, targetDateStr, originalPrincipal) {
    document.getElementById('summaryTotalDebt').innerText = formatCurrency(totalDebt);
    document.getElementById('summaryTargetDateSub').innerText = `คำนวณ ณ วันที่ ${formatDateThai(targetDateStr)}`;

    document.getElementById('summaryRemainingPrincipal').innerText = formatCurrency(remainingPrincipal);
    document.getElementById('summaryOriginalPrincipalSub').innerText = `จากเงินต้นฟ้อง ${formatCurrency(originalPrincipal)}`;

    document.getElementById('summaryTotalInterest').innerText = formatCurrency(totalInterest);
    document.getElementById('summaryInterestDaysSub').innerText = `รวมระยะเวลา ${totalDays} วัน`;

    document.getElementById('summaryTotalFees').innerText = formatCurrency(totalFees);
    document.getElementById('summaryPaidSub').innerText = `ชำระแล้วสะสม ${formatCurrency(totalPaid)}`;
  }

  function renderTable(rows) {
    const tbody = document.getElementById('ledgerTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!rows || rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; color: var(--text-muted); padding: 2rem;">ไม่มีข้อมูลการคำนวณ โปรดตรวจสอบวันที่ผิดนัดและวันคำนวณ</td></tr>`;
      return;
    }

    rows.forEach(r => {
      const tr = document.createElement('tr');
      if (r.isPayment) tr.className = 'payment-row';

      tr.innerHTML = `
        <td><strong>${r.idx}</strong></td>
        <td>${r.periodText}</td>
        <td>${r.days} วัน</td>
        <td>${r.rate}</td>
        <td>${formatCurrency(r.startPrincipal)}</td>
        <td style="color: var(--accent-amber);">${formatCurrency(r.interestAccrued)}</td>
        <td style="color: var(--accent-emerald);">${r.paymentAmt > 0 ? formatCurrency(r.paymentAmt) : '-'}</td>
        <td>${r.feeDeduct > 0 ? formatCurrency(r.feeDeduct) : '-'}</td>
        <td>${r.interestDeduct > 0 ? formatCurrency(r.interestDeduct) : '-'}</td>
        <td>${r.principalDeduct > 0 ? formatCurrency(r.principalDeduct) : '-'}</td>
        <td><strong>${formatCurrency(r.endPrincipal)}</strong></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderVerdictText(origPrincipal, remPrincipal, totalInterest, totalFees, totalDebt, targetDateStr, caseBlack, caseRed) {
    const container = document.getElementById('verdictSummaryText');
    if (!container) return;
    container.innerHTML = `
      <p style="margin-bottom:6px;"><strong>สรุปภาระหนี้ตามคำสั่งศาล (คดีหมายเลขดำที่ ${caseBlack} / คดีหมายเลขแดงที่ ${caseRed}):</strong></p>
      <p style="margin-bottom:8px;">จำเลยมีหน้าที่ต้องชำระหนี้แก่โจทก์ ณ วันที่ <strong>${formatDateThai(targetDateStr)}</strong> เป็นจำนวนเงินรวมทั้งสิ้น
      <strong style="color:var(--gold);font-size:1.12rem;">${formatCurrency(totalDebt)}</strong> ประกอบด้วย:</p>
      <ul style="margin:0 0 8px 1.4rem;padding:0;display:flex;flex-direction:column;gap:3px;">
        <li>เงินต้นคงเหลือ: <strong>${formatCurrency(remPrincipal)}</strong> (จากเงินต้นฟ้อง ${formatCurrency(origPrincipal)})</li>
        <li>ดอกเบี้ยสะสมค้างชำระ: <strong>${formatCurrency(totalInterest)}</strong></li>
        <li>ค่าธรรมเนียมศาลและค่าทนายความที่ศาลสั่งใช้แทนคงเหลือ: <strong>${formatCurrency(totalFees)}</strong></li>
      </ul>
      <p style="margin:0;font-size:0.83rem;color:var(--text-muted);">* หมายเหตุ: การตัดชำระหนี้เป็นไปตามประมวลกฎหมายแพ่งและพาณิชย์ มาตรา 329 โดยหักค่าธรรมเนียมศาล/ค่าใช้จ่าย แล้วจึงหักดอกเบี้ยค้างชำระ และส่วนที่เหลือจึงนำไปตัดเงินต้น</p>
    `;
  }

  // 5. Sample Datasets Loaders
  function loadSampleCase1() {
    currentPreset = 'custom';
    document.getElementById('caseBlackNo').value = 'พ. 1024/2563';
    document.getElementById('caseRedNo').value = 'พ. 2150/2563';
    document.getElementById('plaintiffName').value = 'ธนาคารพัฒนาสินเชื่อ จำกัด (มหาชน)';
    document.getElementById('defendantName').value = 'นายสมชาย ใจดี';
    document.getElementById('principalAmount').value = 200000;
    document.getElementById('defaultDate').value = '2020-01-01';
    document.getElementById('filingDate').value = '2020-11-15';
    document.getElementById('judgmentDate').value = '2021-03-15';
    document.getElementById('courtFeeAwarded').value = 4000;
    document.getElementById('attorneyFeeAwarded').value = 5000;

    interestStages = [
      { startDate: '2020-01-01', endDate: '2021-04-10', rate: 7.5, label: 'ดอกเบี้ยผิดนัดก่อน 11 เม.ย. 64 (7.5%)' },
      { startDate: '2021-04-11', endDate: '', rate: 5.0, label: 'ดอกเบี้ยผิดนัดหลัง 11 เม.ย. 64 (5.0%)' }
    ];

    partialPayments = [
      { date: '2021-07-01', amount: 15000, note: 'ผ่อนชำระงวดที่ 1' },
      { date: '2022-01-10', amount: 30000, note: 'ผ่อนชำระงวดที่ 2' }
    ];

    renderInterestStages();
    renderPayments();
    calculateAndRender();

    const results = document.querySelector('.results-dashboard');
    if (results) {
      results.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function loadSampleCase2() {
    currentPreset = 'custom';
    document.getElementById('caseBlackNo').value = 'ผบ. 512/2564';
    document.getElementById('caseRedNo').value = 'ผบ. 980/2564';
    document.getElementById('plaintiffName').value = 'บริษัท ไทยการค้าการเกษตร จำกัด';
    document.getElementById('defendantName').value = 'นายวิชัย รุ่งเรือง';
    document.getElementById('principalAmount').value = 500000;
    document.getElementById('defaultDate').value = '2019-06-01';
    document.getElementById('filingDate').value = '2020-12-01';
    document.getElementById('judgmentDate').value = '2021-05-15';
    document.getElementById('courtFeeAwarded').value = 10000;
    document.getElementById('attorneyFeeAwarded').value = 8000;

    interestStages = [
      { startDate: '2019-06-01', endDate: '2020-12-01', rate: 15.0, label: 'อัตราตามสัญญาถึงวันฟ้อง (15%)' },
      { startDate: '2020-12-02', endDate: '2021-04-10', rate: 7.5, label: 'ดอกเบี้ยผิดนัดเดิม (7.5%)' },
      { startDate: '2021-04-11', endDate: '', rate: 5.0, label: 'ดอกเบี้ยผิดนัดใหม่ (5.0%)' }
    ];

    partialPayments = [
      { date: '2022-04-15', amount: 100000, note: 'ผ่อนชำระงวดที่ 1' }
    ];

    renderInterestStages();
    renderPayments();
    calculateAndRender();

    const results = document.querySelector('.results-dashboard');
    if (results) {
      results.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // 6. Main Legal Interest Calculation Engine
  function calculateAndRender() {
    const principalInit = parseFloat(document.getElementById('principalAmount')?.value) || 0;
    const calcTargetDateStr = document.getElementById('calcTargetDate')?.value || todayStr;
    const courtFee = parseFloat(document.getElementById('courtFeeAwarded')?.value) || 0;
    const attorneyFee = parseFloat(document.getElementById('attorneyFeeAwarded')?.value) || 0;

    const caseBlackNo = document.getElementById('caseBlackNo')?.value || '-';
    const caseRedNo = document.getElementById('caseRedNo')?.value || '-';
    const plaintiffName = document.getElementById('plaintiffName')?.value || '-';
    const defendantName = document.getElementById('defendantName')?.value || '-';

    const printCaseInfo = document.getElementById('printCaseInfo');
    const printParties = document.getElementById('printParties');
    if (printCaseInfo) printCaseInfo.innerText = `คดีหมายเลขดำที่ ${caseBlackNo} / คดีหมายเลขแดงที่ ${caseRedNo}`;
    if (printParties) printParties.innerText = `โจทก์: ${plaintiffName} | จำเลย: ${defendantName}`;

    if (!calcTargetDateStr || interestStages.length === 0) return;

    let currentPrincipal = principalInit;
    let accruedInterestTotal = 0;
    let accruedFeesTotal = courtFee + attorneyFee;
    let totalPaid = 0;
    let totalDaysCalculated = 0;

    let ledgerRows = [];

    const curDate = parseDateLocal(interestStages[0].startDate);
    const targetDate = parseDateLocal(calcTargetDateStr);

    if (!curDate || !targetDate || curDate > targetDate) {
      renderSummary(0, currentPrincipal, 0, accruedFeesTotal, 0, 0, calcTargetDateStr, principalInit);
      renderTable([]);
      return;
    }

    const sortedPayments = partialPayments
      .filter(p => p.date && parseDateLocal(p.date) <= targetDate && parseDateLocal(p.date) >= curDate)
      .map(p => ({ ...p, processed: false }))
      .sort((a, b) => parseDateLocal(a.date) - parseDateLocal(b.date));

    let checkpoints = new Set();
    checkpoints.add(formatDateIso(curDate));
    checkpoints.add(formatDateIso(targetDate));

    interestStages.forEach(stg => {
      if (stg.startDate) {
        const dStart = parseDateLocal(stg.startDate);
        if (dStart && dStart >= curDate && dStart <= targetDate) {
          checkpoints.add(stg.startDate);
        }
      }
      if (stg.endDate) {
        const dEnd = parseDateLocal(stg.endDate);
        if (dEnd && dEnd >= curDate && dEnd <= targetDate) {
          const dNext = new Date(dEnd.getFullYear(), dEnd.getMonth(), dEnd.getDate() + 1);
          if (dNext <= targetDate) checkpoints.add(formatDateIso(dNext));
        }
      }
    });

    sortedPayments.forEach(pmt => checkpoints.add(pmt.date));

    let sortedCheckpoints = Array.from(checkpoints).sort((a, b) => parseDateLocal(a) - parseDateLocal(b));

    let activeRate = interestStages[0].rate;
    let rowIdx = 1;

    for (let i = 0; i < sortedCheckpoints.length - 1; i++) {
      let pStartStr = sortedCheckpoints[i];
      let pEndStr = sortedCheckpoints[i + 1];

      let dStart = parseDateLocal(pStartStr);
      let dEnd = parseDateLocal(pEndStr);

      let pmtToday = sortedPayments.find(p => p.date === pStartStr && !p.processed);
      if (pmtToday) {
        pmtToday.processed = true;
        let pmtAmt = pmtToday.amount;
        totalPaid += pmtAmt;

        let feeDeduct = Math.min(pmtAmt, accruedFeesTotal);
        let remAfterFee = pmtAmt - feeDeduct;
        accruedFeesTotal -= feeDeduct;

        let interestDeduct = Math.min(remAfterFee, accruedInterestTotal);
        let remAfterInterest = remAfterFee - interestDeduct;
        accruedInterestTotal -= interestDeduct;

        let principalDeduct = Math.min(remAfterInterest, currentPrincipal);
        currentPrincipal -= principalDeduct;

        ledgerRows.push({
          idx: `ชำระเงิน (${formatDateThai(pmtToday.date)})`,
          periodText: `รับชำระเงิน (${pmtToday.note || 'ผ่อนชำระ'})`,
          days: 0,
          rate: '-',
          startPrincipal: currentPrincipal + principalDeduct,
          interestAccrued: 0,
          paymentAmt: pmtAmt,
          feeDeduct: feeDeduct,
          interestDeduct: interestDeduct,
          principalDeduct: principalDeduct,
          endPrincipal: currentPrincipal,
          isPayment: true
        });
      }

      activeRate = getActiveRateForDate(pStartStr, interestStages);
      let days = diffDays(dStart, dEnd);

      if (days > 0) {
        totalDaysCalculated += days;

        let daysInYear = isLeapYear(dStart.getFullYear()) ? 366 : 365;
        let periodInterest = currentPrincipal * (activeRate / 100) * (days / daysInYear);

        accruedInterestTotal += periodInterest;

        ledgerRows.push({
          idx: rowIdx++,
          periodText: `${formatDateThai(pStartStr)} - ${formatDateThai(pEndStr)}`,
          days: days,
          rate: activeRate.toFixed(2) + '%',
          startPrincipal: currentPrincipal,
          interestAccrued: periodInterest,
          paymentAmt: 0,
          feeDeduct: 0,
          interestDeduct: 0,
          principalDeduct: 0,
          endPrincipal: currentPrincipal,
          isPayment: false
        });
      }
    }

    let lastTargetPmt = sortedPayments.find(p => p.date === calcTargetDateStr && !p.processed);
    if (lastTargetPmt) {
      let pmtAmt = lastTargetPmt.amount;
      totalPaid += pmtAmt;

      let feeDeduct = Math.min(pmtAmt, accruedFeesTotal);
      let remAfterFee = pmtAmt - feeDeduct;
      accruedFeesTotal -= feeDeduct;

      let interestDeduct = Math.min(remAfterFee, accruedInterestTotal);
      let remAfterInterest = remAfterFee - interestDeduct;
      accruedInterestTotal -= interestDeduct;

      let principalDeduct = Math.min(remAfterInterest, currentPrincipal);
      currentPrincipal -= principalDeduct;

      ledgerRows.push({
        idx: `ชำระเงิน (${formatDateThai(lastTargetPmt.date)})`,
        periodText: `รับชำระเงินในวันคำนวณ`,
        days: 0,
        rate: '-',
        startPrincipal: currentPrincipal + principalDeduct,
        interestAccrued: 0,
        paymentAmt: pmtAmt,
        feeDeduct: feeDeduct,
        interestDeduct: interestDeduct,
        principalDeduct: principalDeduct,
        endPrincipal: currentPrincipal,
        isPayment: true
      });
    }

    const totalDebtNet = currentPrincipal + accruedInterestTotal + accruedFeesTotal;

    renderSummary(totalDebtNet, currentPrincipal, accruedInterestTotal, accruedFeesTotal, totalPaid, totalDaysCalculated, calcTargetDateStr, principalInit);
    renderTable(ledgerRows);
    renderVerdictText(principalInit, currentPrincipal, accruedInterestTotal, accruedFeesTotal, totalDebtNet, calcTargetDateStr, caseBlackNo, caseRedNo);
  }

  // 7. Import Modal Handlers & Data Parsers
  const importModal = document.getElementById('importModal');
  const btnOpenImportModal = document.getElementById('btnOpenImportModal');
  const btnCloseImportModal = document.getElementById('btnCloseImportModal');
  const btnCancelImport = document.getElementById('btnCancelImport');
  const btnConfirmImport = document.getElementById('btnConfirmImport');
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const uploadFileInfo = document.getElementById('uploadFileInfo');
  const importTextarea = document.getElementById('importTextarea');

  const btnDownloadCsvTemplate = document.getElementById('btnDownloadCsvTemplate');
  const btnDownloadJsonTemplate = document.getElementById('btnDownloadJsonTemplate');

  let pendingImportData = null;

  if (btnOpenImportModal && importModal) {
    btnOpenImportModal.addEventListener('click', (e) => {
      e.preventDefault();
      importModal.style.setProperty('display', 'flex', 'important');
      pendingImportData = null;
      if (uploadFileInfo) uploadFileInfo.style.display = 'none';
      if (importTextarea) importTextarea.value = '';
    });
  }

  const closeModal = () => {
    if (importModal) importModal.style.setProperty('display', 'none', 'important');
  };
  if (btnCloseImportModal) btnCloseImportModal.addEventListener('click', closeModal);
  if (btnCancelImport) btnCancelImport.addEventListener('click', closeModal);

  const modalTabBtns = importModal?.querySelectorAll('.tab-btn');
  const modalTabContents = importModal?.querySelectorAll('.tab-content');
  if (modalTabBtns) {
    modalTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modalTabBtns.forEach(b => b.classList.remove('active'));
        modalTabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const targetTab = btn.getAttribute('data-tab');
        const tabEl = document.getElementById(targetTab);
        if (tabEl) tabEl.classList.add('active');
      });
    });
  }

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleFileRead(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileRead(e.target.files[0]);
      }
    });
  }

  function handleFileRead(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      if (file.name.endsWith('.json')) {
        try {
          pendingImportData = JSON.parse(content);
          showUploadNotice(`อ่านไฟล์ <strong>${file.name}</strong> สำเร็จ (พบข้อมูลคดี JSON)`);
        } catch (err) {
          showUploadNotice(`❌ รูปแบบไฟล์ JSON ไม่ถูกต้อง: ${err.message}`, true);
        }
      } else if (file.name.endsWith('.csv')) {
        const parsed = parseCsvData(content);
        if (parsed) {
          pendingImportData = convertCsvToDebtorData(parsed);
          showUploadNotice(`อ่านไฟล์ <strong>${file.name}</strong> สำเร็จ (พบข้อมูลคดี CSV)`);
        } else {
          showUploadNotice(`❌ ไม่สามารถอ่านข้อมูลจากไฟล์ CSV ได้`, true);
        }
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  function showUploadNotice(msg, isError = false) {
    if (!uploadFileInfo) return;
    uploadFileInfo.style.display = 'flex';
    uploadFileInfo.style.borderColor = isError ? 'var(--accent-rose)' : 'var(--accent-emerald)';
    uploadFileInfo.style.background = isError ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)';
    uploadFileInfo.style.color = isError ? '#fca5a5' : '#a7f3d0';
    uploadFileInfo.innerHTML = `<span>${msg}</span>`;
  }

  function parseCsvData(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return null;
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      let rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] || '';
      });
      return rowObj;
    });
    return { headers, rows };
  }

  function convertCsvToDebtorData({ headers, rows }) {
    if (rows.length === 0) return null;
    const first = rows[0];

    let debtorObj = {
      caseBlackNo: first['หมายเลขคดีดำ'] || first['caseBlackNo'] || first['คดีดำ'] || '',
      caseRedNo: first['หมายเลขคดีแดง'] || first['caseRedNo'] || first['คดีแดง'] || '',
      plaintiffName: first['ชื่อโจทก์'] || first['plaintiffName'] || first['โจทก์'] || '',
      defendantName: first['ชื่อจำเลย'] || first['defendantName'] || first['จำเลย'] || '',
      principalAmount: parseFloat(first['เงินต้นฟ้อง'] || first['เงินต้น'] || first['principalAmount']) || 100000,
      defaultDate: first['วันผิดนัด'] || first['defaultDate'] || '2020-01-01',
      filingDate: first['วันฟ้อง'] || first['filingDate'] || '2021-01-01',
      judgmentDate: first['วันพิพากษา'] || first['judgmentDate'] || '',
      courtFeeAwarded: parseFloat(first['ค่าธรรมเนียมศาล'] || first['courtFeeAwarded']) || 0,
      attorneyFeeAwarded: parseFloat(first['ค่าทนายความ'] || first['attorneyFeeAwarded']) || 0,
      interestStages: [],
      partialPayments: []
    };

    rows.forEach((r, idx) => {
      const pmtDate = r['วันที่ชำระเงิน'] || r['paymentDate'] || r['วันที่ชำระ'];
      const pmtAmount = parseFloat(r['จำนวนเงินชำระ'] || r['paymentAmount'] || r['จำนวนเงิน']);
      if (pmtDate && pmtAmount > 0) {
        debtorObj.partialPayments.push({
          date: pmtDate,
          amount: pmtAmount,
          note: r['หมายเหตุ'] || r['note'] || `ชำระงวดที่ ${idx + 1}`
        });
      }
    });

    return debtorObj;
  }

  if (btnConfirmImport) {
    btnConfirmImport.addEventListener('click', () => {
      const activeTab = importModal.querySelector('.tab-content.active');
      if (activeTab && activeTab.id === 'tabTextPaste' && importTextarea.value.trim()) {
        const txt = importTextarea.value.trim();
        if (txt.startsWith('{') || txt.startsWith('[')) {
          try {
            pendingImportData = JSON.parse(txt);
          } catch (e) {
            alert('❌ ไม่สามารถอ่านข้อความ JSON ได้: ' + e.message);
            return;
          }
        } else if (txt.includes(',')) {
          const parsed = parseCsvData(txt);
          if (parsed) pendingImportData = convertCsvToDebtorData(parsed);
        }
      }

      if (!pendingImportData) {
        alert('โปรดเลือกไฟล์หรือวางข้อความข้อมูลลูกหนี้ก่อนกดยืนยัน');
        return;
      }

      applyImportedData(pendingImportData);
      closeModal();
    });
  }

  function applyImportedData(data) {
    currentPreset = 'custom';
    if (data.caseBlackNo !== undefined) document.getElementById('caseBlackNo').value = data.caseBlackNo;
    if (data.caseRedNo !== undefined) document.getElementById('caseRedNo').value = data.caseRedNo;
    if (data.plaintiffName !== undefined) document.getElementById('plaintiffName').value = data.plaintiffName;
    if (data.defendantName !== undefined) document.getElementById('defendantName').value = data.defendantName;
    if (data.principalAmount !== undefined) document.getElementById('principalAmount').value = data.principalAmount;
    if (data.defaultDate !== undefined) document.getElementById('defaultDate').value = data.defaultDate;
    if (data.filingDate !== undefined) document.getElementById('filingDate').value = data.filingDate;
    if (data.judgmentDate !== undefined) document.getElementById('judgmentDate').value = data.judgmentDate;
    if (data.calcTargetDate !== undefined) document.getElementById('calcTargetDate').value = data.calcTargetDate;
    if (data.courtFeeAwarded !== undefined) document.getElementById('courtFeeAwarded').value = data.courtFeeAwarded;
    if (data.attorneyFeeAwarded !== undefined) document.getElementById('attorneyFeeAwarded').value = data.attorneyFeeAwarded;

    if (Array.isArray(data.interestStages) && data.interestStages.length > 0) {
      interestStages = data.interestStages;
    } else {
      applyPreset('legal2021');
    }

    if (Array.isArray(data.partialPayments)) {
      partialPayments = data.partialPayments;
    } else {
      partialPayments = [];
    }

    renderInterestStages();
    renderPayments();
    calculateAndRender();

    const results = document.querySelector('.results-dashboard');
    if (results) results.scrollIntoView({ behavior: 'smooth' });
  }

  if (btnDownloadCsvTemplate) {
    btnDownloadCsvTemplate.addEventListener('click', () => {
      const csvContent = `หมายเลขคดีดำ,หมายเลขคดีแดง,ชื่อโจทก์,ชื่อจำเลย,เงินต้นฟ้อง,วันผิดนัด,วันฟ้อง,วันพิพากษา,ค่าธรรมเนียมศาล,ค่าทนายความ,วันที่ชำระเงิน,จำนวนเงินชำระ,หมายเหตุ
พ. 101/2565,พ. 505/2565,ธนาคารไทยการเงิน จำกัด,นายสมคิด มั่งมี,250000,2020-01-01,2021-01-01,2021-06-01,5000,6000,2021-08-15,20000,ผ่อนชำระงวดที่ 1
พ. 101/2565,พ. 505/2565,ธนาคารไทยการเงิน จำกัด,นายสมคิด มั่งมี,250000,2020-01-01,2021-01-01,2021-06-01,5000,6000,2022-02-10,35000,ผ่อนชำระงวดที่ 2`;
      downloadFile(csvContent, 'Debtor_Import_Template.csv', 'text/csv;charset=utf-8;');
    });
  }

  if (btnDownloadJsonTemplate) {
    btnDownloadJsonTemplate.addEventListener('click', () => {
      const jsonObj = {
        caseBlackNo: "ผบ. 888/2565",
        caseRedNo: "ผบ. 999/2565",
        plaintiffName: "บริษัท เงินทุนหลักทรัพย์ จำกัด",
        defendantName: "นางสาวสมหญิง สุขใจ",
        principalAmount: 180000,
        defaultDate: "2020-03-01",
        filingDate: "2021-02-01",
        judgmentDate: "2021-07-01",
        courtFeeAwarded: 3500,
        attorneyFeeAwarded: 4000,
        interestStages: [
          { startDate: "2020-03-01", endDate: "2021-04-10", rate: 7.5, label: "อัตราเดิม 7.5%" },
          { startDate: "2021-04-11", endDate: "", rate: 5.0, label: "อัตราใหม่ 5.0%" }
        ],
        partialPayments: [
          { date: "2021-09-01", amount: 12000, note: "ชำระครั้งที่ 1" },
          { date: "2022-03-15", amount: 25000, note: "ชำระครั้งที่ 2" }
        ]
      };
      downloadFile(JSON.stringify(jsonObj, null, 2), 'Debtor_Import_Template.json', 'application/json;');
    });
  }

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob(['\uFEFF' + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Saved Cases — SQLite API ────────────────────────────────────────
  const savedCasesModal      = document.getElementById('savedCasesModal');
  const btnOpenSavedCasesModal  = document.getElementById('btnOpenSavedCasesModal');
  const btnCloseSavedCasesModal = document.getElementById('btnCloseSavedCasesModal');
  const btnCloseSavedCases      = document.getElementById('btnCloseSavedCases');
  const btnSaveCurrentCase      = document.getElementById('btnSaveCurrentCase');
  const btnModalSaveCurrentCase = document.getElementById('btnModalSaveCurrentCase');
  const savedCasesCountBadge    = document.getElementById('savedCasesCountBadge');
  const savedCasesTableBody     = document.getElementById('savedCasesTableBody');

  const API = '/api/cases';

  // ─── Toast notification ───────────────────────────────────────────
  function showToast(msg, type = 'success') {
    let toast = document.getElementById('appToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'appToast';
      toast.style.cssText = `
        position:fixed; bottom:1.5rem; right:1.5rem; z-index:999999;
        padding:0.75rem 1.25rem; border-radius:10px; font-size:0.92rem;
        font-family:var(--font); font-weight:600;
        box-shadow:0 4px 20px rgba(0,0,0,0.15);
        display:none; align-items:center; gap:8px; max-width:340px;
        transition: all 0.3s ease;
      `;
      document.body.appendChild(toast);
    }
    toast.style.background = type === 'success' ? '#059669' : '#dc2626';
    toast.style.color = '#fff';
    toast.style.display = 'flex';
    toast.innerText = msg;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.display = 'none'; }, 3500);
  }

  // ─── Badge ────────────────────────────────────────────────────────
  async function updateSavedCasesBadge() {
    try {
      const res = await fetch(API);
      const json = await res.json();
      if (savedCasesCountBadge && json.count !== undefined) {
        savedCasesCountBadge.innerText = json.count;
      }
    } catch { /* server ยังไม่พร้อม — ไม่แสดง error */ }
  }

  // ─── Build current form data object ──────────────────────────────
  function buildCasePayload() {
    return {
      caseBlackNo:        document.getElementById('caseBlackNo')?.value || '',
      caseRedNo:          document.getElementById('caseRedNo')?.value   || '',
      plaintiffName:      document.getElementById('plaintiffName')?.value || '',
      defendantName:      document.getElementById('defendantName')?.value || '',
      principalAmount:    parseFloat(document.getElementById('principalAmount')?.value) || 0,
      defaultDate:        document.getElementById('defaultDate')?.value  || '',
      filingDate:         document.getElementById('filingDate')?.value   || '',
      judgmentDate:       document.getElementById('judgmentDate')?.value || '',
      courtFeeAwarded:    parseFloat(document.getElementById('courtFeeAwarded')?.value) || 0,
      attorneyFeeAwarded: parseFloat(document.getElementById('attorneyFeeAwarded')?.value) || 0,
      interestStages:     [...interestStages],
      partialPayments:    [...partialPayments]
    };
  }

  // ─── Save (POST) ──────────────────────────────────────────────────
  async function saveCurrentCase() {
    const payload = buildCasePayload();
    const defendant = payload.defendantName || 'ไม่ระบุ';
    const caseNo    = payload.caseBlackNo   || '-';
    try {
      const res  = await fetch(API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showToast(`✅ บันทึกคดี ${caseNo} (${defendant}) สำเร็จแล้ว!`);
      await updateSavedCasesBadge();
      await renderSavedCasesTable();
    } catch (err) {
      showToast(`❌ บันทึกไม่สำเร็จ: ${err.message}`, 'error');
    }
  }

  // ─── Render table ─────────────────────────────────────────────────
  async function renderSavedCasesTable() {
    if (!savedCasesTableBody) return;
    savedCasesTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--text-muted);">⏳ กำลังโหลดข้อมูลจากฐานข้อมูล...</td></tr>`;

    let cases = [];
    try {
      const res  = await fetch(API);
      const json = await res.json();
      cases = json.data || [];
    } catch {
      savedCasesTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--rose);">❌ เชื่อมต่อ Server ไม่ได้ กรุณาตรวจสอบว่า node server.js กำลังทำงาน</td></tr>`;
      return;
    }

    if (cases.length === 0) {
      savedCasesTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;">ยังไม่มีรายการคดีที่บันทึกในฐานข้อมูล</td></tr>`;
      return;
    }

    savedCasesTableBody.innerHTML = '';
    cases.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${c.caseBlackNo || '-'}</strong> / <span style="color:var(--gold);">${c.caseRedNo || '-'}</span></td>
        <td>
          <div style="font-weight:600;">${c.plaintiffName || '-'}</div>
          <div style="font-size:0.78rem;color:var(--text-muted);">จำเลย: ${c.defendantName || '-'}</div>
        </td>
        <td>${formatCurrency(c.principalAmount)}</td>
        <td style="color:var(--gold);font-weight:700;">${formatCurrency(c.principalAmount)}</td>
        <td style="font-size:0.8rem;">${formatDateThai(c.savedAt || c.saved_at)}</td>
        <td style="text-align:center;white-space:nowrap;">
          <button type="button" class="btn btn-outline-gold load-saved-case" data-id="${c.id}" style="padding:3px 10px;font-size:0.8rem;">
            <i data-lucide="folder-open"></i> โหลด
          </button>
          <button type="button" class="btn-danger-sm delete-saved-case" data-id="${c.id}" style="margin-left:4px;">ลบ</button>
        </td>
      `;
      savedCasesTableBody.appendChild(tr);
    });

    if (window.lucide) window.lucide.createIcons();

    savedCasesTableBody.querySelectorAll('.load-saved-case').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = Number(e.currentTarget.getAttribute('data-id'));
        try {
          const res  = await fetch(`${API}/${id}`);
          const json = await res.json();
          if (json.success) {
            applyImportedData(json.data);
            closeSavedCasesModal();
            showToast('✅ โหลดข้อมูลคดีเรียบร้อยแล้ว');
          }
        } catch (err) {
          showToast('❌ โหลดข้อมูลไม่สำเร็จ', 'error');
        }
      });
    });

    savedCasesTableBody.querySelectorAll('.delete-saved-case').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = Number(e.currentTarget.getAttribute('data-id'));
        if (!confirm('คุณต้องการลบคดีนี้ออกจากฐานข้อมูลหรือไม่?')) return;
        try {
          const res  = await fetch(`${API}/${id}`, { method: 'DELETE' });
          const json = await res.json();
          if (!json.success) throw new Error(json.error);
          showToast('🗑️ ลบคดีเรียบร้อยแล้ว');
          await updateSavedCasesBadge();
          await renderSavedCasesTable();
        } catch (err) {
          showToast(`❌ ลบไม่สำเร็จ: ${err.message}`, 'error');
        }
      });
    });
  }

  function openSavedCasesModal() {
    if (savedCasesModal) {
      renderSavedCasesTable();
      savedCasesModal.style.setProperty('display', 'flex', 'important');
    }
  }

  function closeSavedCasesModal() {
    if (savedCasesModal) {
      savedCasesModal.style.setProperty('display', 'none', 'important');
    }
  }

  if (btnOpenSavedCasesModal)  btnOpenSavedCasesModal.addEventListener('click', openSavedCasesModal);
  if (btnCloseSavedCasesModal) btnCloseSavedCasesModal.addEventListener('click', closeSavedCasesModal);
  if (btnCloseSavedCases)      btnCloseSavedCases.addEventListener('click', closeSavedCasesModal);
  if (btnSaveCurrentCase)      btnSaveCurrentCase.addEventListener('click', saveCurrentCase);
  if (btnModalSaveCurrentCase) btnModalSaveCurrentCase.addEventListener('click', saveCurrentCase);

  updateSavedCasesBadge();

  // --- Add New Debtor Modal Handlers ---
  const addDebtorModal = document.getElementById('addDebtorModal');
  const btnOpenAddDebtorModal = document.getElementById('btnOpenAddDebtorModal');
  const btnCloseAddDebtorModal = document.getElementById('btnCloseAddDebtorModal');
  const btnCancelAddDebtor = document.getElementById('btnCancelAddDebtor');
  const quickAddDebtorForm = document.getElementById('quickAddDebtorForm');

  function openAddDebtorModal() {
    if (addDebtorModal) {
      addDebtorModal.style.setProperty('display', 'flex', 'important');
      document.getElementById('newDebtorName')?.focus();
    }
  }

  function closeAddDebtorModal() {
    if (addDebtorModal) {
      addDebtorModal.style.setProperty('display', 'none', 'important');
    }
  }

  if (btnOpenAddDebtorModal) btnOpenAddDebtorModal.addEventListener('click', openAddDebtorModal);
  if (btnCloseAddDebtorModal) btnCloseAddDebtorModal.addEventListener('click', closeAddDebtorModal);
  if (btnCancelAddDebtor) btnCancelAddDebtor.addEventListener('click', closeAddDebtorModal);

  if (quickAddDebtorForm) {
    quickAddDebtorForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const debtorName = document.getElementById('newDebtorName')?.value || 'ลูกหนี้ใหม่';
      const plaintiffName = document.getElementById('newPlaintiffName')?.value || '';
      const caseBlackNo = document.getElementById('newCaseBlackNo')?.value || '';
      const caseRedNo = document.getElementById('newCaseRedNo')?.value || '';
      const principalAmt = parseFloat(document.getElementById('newPrincipalAmount')?.value) || 100000;
      const defaultDate = document.getElementById('newDefaultDate')?.value || '2020-01-01';
      const filingDate = document.getElementById('newFilingDate')?.value || '2021-01-01';
      const preset = document.getElementById('newInterestPreset')?.value || 'legal2021';

      // Populate main form fields
      document.getElementById('defendantName').value = debtorName;
      if (plaintiffName) document.getElementById('plaintiffName').value = plaintiffName;
      if (caseBlackNo) document.getElementById('caseBlackNo').value = caseBlackNo;
      if (caseRedNo) document.getElementById('caseRedNo').value = caseRedNo;
      document.getElementById('principalAmount').value = principalAmt;
      document.getElementById('defaultDate').value = defaultDate;
      document.getElementById('filingDate').value = filingDate;

      currentPreset = preset;
      applyPreset(preset);
      partialPayments = []; // Reset payments for new debtor
      renderPayments();
      calculateAndRender();

      // Automatically save new debtor into storage
      saveCurrentCase();

      closeAddDebtorModal();
      quickAddDebtorForm.reset();
    });
  }

  // 8. Event Listeners Setup
  if (btnSampleCase1) {
    btnSampleCase1.addEventListener('click', (e) => {
      e.preventDefault();
      presetButtons.forEach(b => b.classList.remove('active'));
      btnSampleCase1.classList.add('active');
      loadSampleCase1();
    });
  }

  if (btnSampleCase2) {
    btnSampleCase2.addEventListener('click', (e) => {
      e.preventDefault();
      presetButtons.forEach(b => b.classList.remove('active'));
      btnSampleCase2.classList.add('active');
      loadSampleCase2();
    });
  }

  presetButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      presetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const preset = btn.getAttribute('data-preset');
      if (preset) {
        currentPreset = preset;
        applyPreset(preset);
        calculateAndRender();
      }
    });
  });

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      window.print();
    });
  }

  if (btnPrintReport) {
    btnPrintReport.addEventListener('click', () => window.print());
  }

  if (btnExportJson) {
    btnExportJson.addEventListener('click', () => {
      const data = {
        caseBlackNo: document.getElementById('caseBlackNo')?.value,
        caseRedNo: document.getElementById('caseRedNo')?.value,
        plaintiffName: document.getElementById('plaintiffName')?.value,
        defendantName: document.getElementById('defendantName')?.value,
        principalAmount: document.getElementById('principalAmount')?.value,
        defaultDate: document.getElementById('defaultDate')?.value,
        filingDate: document.getElementById('filingDate')?.value,
        judgmentDate: document.getElementById('judgmentDate')?.value,
        calcTargetDate: document.getElementById('calcTargetDate')?.value,
        courtFeeAwarded: document.getElementById('courtFeeAwarded')?.value,
        attorneyFeeAwarded: document.getElementById('attorneyFeeAwarded')?.value,
        interestStages,
        partialPayments
      };
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `court-interest-calc-${data.caseBlackNo || 'case'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (btnAddInterestStage) {
    btnAddInterestStage.addEventListener('click', () => {
      interestStages.push({
        startDate: document.getElementById('defaultDate')?.value || '2020-01-01',
        endDate: '',
        rate: 5.0,
        label: 'กำหนดเอง'
      });
      renderInterestStages();
      calculateAndRender();
    });
  }

  if (btnAddPayment) {
    btnAddPayment.addEventListener('click', () => {
      partialPayments.push({
        date: document.getElementById('judgmentDate')?.value || todayStr,
        amount: 10000,
        note: 'ผ่อนชำระงวดที่ ' + (partialPayments.length + 1)
      });
      renderPayments();
      calculateAndRender();
    });
  }

  if (courtForm) {
    courtForm.addEventListener('submit', (e) => {
      e.preventDefault();
      calculateAndRender();
    });

    courtForm.querySelectorAll('input, select').forEach(input => {
      input.addEventListener('change', () => {
        if (currentPreset === 'legal2021' || currentPreset === 'contract15' || currentPreset === 'contractAndLegal') {
          applyPreset(currentPreset);
        }
        calculateAndRender();
      });
    });
  }

  // 8. FINAL INITIALIZATION AT THE VERY END (Guarantees all elements & functions exist!)
  applyPreset('legal2021');
  calculateAndRender();
});
