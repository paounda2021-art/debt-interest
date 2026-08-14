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
  const btnPrintReport = document.getElementById('btnPrintReport');
  const btnExportJson = document.getElementById('btnExportJson');

  // 2. Initial State
  let currentPreset = 'legal2021';
  let preLitCalcMode = 'daily';
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

  function formatNumberWithCommas(val) {
    if (val === null || val === undefined || val === '') return '';
    const num = parseFloat(String(val).replace(/,/g, ''));
    if (isNaN(num)) return '';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function parseFormattedNumber(val) {
    if (val === null || val === undefined || val === '') return 0;
    const num = parseFloat(String(val).replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
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
      const dStart = parseDateLocal(defaultDate);
      const dLegal = parseDateLocal(legalChangeDate);
      if (dStart && dStart >= dLegal) {
        interestStages = [
          { startDate: defaultDate, endDate: '', rate: 5.0, label: 'ดอกเบี้ยผิดนัดหลัง 11 เม.ย. 64 (5.0%)' }
        ];
      } else {
        interestStages = [
          { startDate: defaultDate, endDate: '2021-04-10', rate: 7.5, label: 'ดอกเบี้ยผิดนัดก่อน 11 เม.ย. 64 (7.5%)' },
          { startDate: legalChangeDate, endDate: '', rate: 5.0, label: 'ดอกเบี้ยผิดนัดหลัง 11 เม.ย. 64 (5.0%)' }
        ];
      }
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
          <input type="number" step="any" class="form-control stage-rate" data-idx="${idx}" value="${stage.rate}">
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
      ['change', 'input'].forEach(evt => {
        inp.addEventListener(evt, (e) => {
          const idx = e.target.getAttribute('data-idx');
          interestStages[idx].rate = parseFloat(e.target.value) || 0;
          calculateAndRender();
        });
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
            <input type="number" step="any" class="form-control pmt-amount" data-idx="${idx}" value="${pmt.amount}">
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
      ['change', 'input'].forEach(evt => {
        inp.addEventListener(evt, (e) => {
          const idx = e.target.getAttribute('data-idx');
          partialPayments[idx].amount = parseFloat(e.target.value) || 0;
          calculateAndRender();
        });
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

  function renderPreLitigationLedger() {
    const tbody = document.getElementById('preLitigationTableBody');
    const noticeText = document.getElementById('preLitCalcNoticeText');
    
    // 1. Inputs
    const preDebt = parseFormattedNumber(document.getElementById('preLitigationDebt')?.value) || parseFormattedNumber(document.getElementById('principalAmount')?.value) || 0;
    const securityDeposit = parseFormattedNumber(document.getElementById('securityDeposit')?.value) || 0; // เงินประกันสัญญา
    const rentalPenaltyFee = parseFormattedNumber(document.getElementById('rentalPenaltyFee')?.value) || 0; // จำนวนเงินรายวัน/เหมาจ่าย (บาท)
    const penaltyType = document.getElementById('rentalPenaltyType')?.value || 'flat';
    const contractPenaltyRateInput = parseFloat(document.getElementById('preLitigationInterestRate')?.value);
    const contractPenaltyRate = !isNaN(contractPenaltyRateInput) ? contractPenaltyRateInput : 0;

    // 2. Dates & duration
    const defaultDateStr = document.getElementById('preLitDefaultDate')?.value || document.getElementById('defaultDate')?.value || '2020-01-01';
    let filingDateStr = document.getElementById('preLitFilingDate')?.value || document.getElementById('filingDate')?.value;
    const calcTargetStr = document.getElementById('calcTargetDate')?.value || todayStr;

    let dStart = parseDateLocal(defaultDateStr);
    let dEnd = parseDateLocal(filingDateStr);

    if (!dEnd || (dStart && dEnd <= dStart)) {
      filingDateStr = calcTargetStr;
      dEnd = parseDateLocal(filingDateStr);
    }

    if (!dStart || !dEnd || dStart >= dEnd) {
      updatePreLitigationFieldStates();
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">โปรดระบุวันผิดนัดชำระและวันฟ้องคดี/วันคำนวณเพื่อแสดงตารางก่อนส่งฟ้อง</td></tr>`;
      return { preDebt, effectivePenalty: 0, totalAccruedInterest: 0, grandTotal: preDebt };
    }

    updatePreLitigationFieldStates();
    syncPreLitCalcModeButtons();

    const thPreLitCalcBadge = document.getElementById('thPreLitCalcBadge');
    if (thPreLitCalcBadge) {
      thPreLitCalcBadge.innerText = penaltyType === 'flat' ? '(เหมาจ่ายต่อวัน)' : (penaltyType === 'daily' ? '(รายวัน)' : '(รายเดือน)');
    }

    if (noticeText) {
      noticeText.innerHTML = penaltyType === 'flat'
        ? `📅 คำนวณผิดนัดจาก <strong>${formatDateThai(defaultDateStr)}</strong> ถึง <strong>${formatDateThai(filingDateStr)}</strong> (โหมดคำนวณเหมาจ่ายต่อวัน)`
        : (penaltyType === 'daily'
          ? `📅 คำนวณผิดนัดจาก <strong>${formatDateThai(defaultDateStr)}</strong> ถึง <strong>${formatDateThai(filingDateStr)}</strong> (โหมดคำนวณรายวัน)`
          : `📅 คำนวณผิดนัดจาก <strong>${formatDateThai(defaultDateStr)}</strong> ถึง <strong>${formatDateThai(filingDateStr)}</strong> (โหมดคำนวณรายเดือน)`);
    }

    let totalDays = Math.round((dEnd - dStart) / (1000 * 3600 * 24));
    if (totalDays <= 0) totalDays = 1;

    let totalMonths = (dEnd.getFullYear() - dStart.getFullYear()) * 12 + (dEnd.getMonth() - dStart.getMonth());
    if (dEnd.getDate() >= dStart.getDate()) {
      totalMonths += Math.round(((dEnd.getDate() - dStart.getDate()) / 30) * 100) / 100;
    }
    if (totalMonths <= 0) totalMonths = 1;
    totalMonths = Math.round(totalMonths * 100) / 100;

    // 3. Gross Contract Penalty calculation
    let grossPenalty = 0;
    let penaltyLabelText = '';

    if (penaltyType === 'flat') {
      if (rentalPenaltyFee > 0) {
        grossPenalty = rentalPenaltyFee * totalDays;
        penaltyLabelText = `ค่าปรับเหมาจ่ายต่อวัน (${formatCurrency(rentalPenaltyFee)} ฿/วัน × ${totalDays} วัน)`;
      } else if (contractPenaltyRate > 0) {
        grossPenalty = preDebt * (contractPenaltyRate / 100) * totalMonths;
        penaltyLabelText = `ค่าปรับตามสัญญา (${contractPenaltyRate}% ต่อเดือน × ${totalMonths} เดือน)`;
      }
    } else if (penaltyType === 'daily') {
      if (rentalPenaltyFee > 0) {
        grossPenalty = rentalPenaltyFee * totalDays;
        penaltyLabelText = `ค่าปรับสัญญาเช่ารายวัน (${formatCurrency(rentalPenaltyFee)} ฿/วัน × ${totalDays} วัน)`;
      } else if (contractPenaltyRate > 0) {
        grossPenalty = preDebt * (contractPenaltyRate / 100) * (totalDays / 30);
        penaltyLabelText = `ค่าปรับตามสัญญา (${contractPenaltyRate}% ต่อเดือน × ${totalDays} วัน)`;
      }
    } else if (penaltyType === 'monthly') {
      if (rentalPenaltyFee > 0) {
        grossPenalty = rentalPenaltyFee * totalMonths;
        penaltyLabelText = `ค่าปรับสัญญาเช่ารายเดือน (${formatCurrency(rentalPenaltyFee)} ฿/เดือน × ${totalMonths} เดือน)`;
      } else if (contractPenaltyRate > 0) {
        grossPenalty = preDebt * (contractPenaltyRate / 100) * totalMonths;
        penaltyLabelText = `ค่าปรับตามสัญญา (${contractPenaltyRate}% ต่อเดือน × ${totalMonths} เดือน)`;
      }
    }

    // 4. Net Principal after deducting Security Deposit
    const netBalanceAfterDeposit = Math.max(0, (preDebt + grossPenalty) - securityDeposit);

    // 5. Pre-litigation Default Interest at 5.0% per year on Net Balance
    const defaultInterestRate = 5.0; // ดอกเบี้ยผิดนัด 5% ต่อปี
    let preLitigationDefaultInterest = 0;

    if (preLitCalcMode === 'monthly') {
      preLitigationDefaultInterest = netBalanceAfterDeposit * (defaultInterestRate / 100) * (totalMonths / 12);
    } else {
      preLitigationDefaultInterest = netBalanceAfterDeposit * (defaultInterestRate / 100) * (totalDays / 365);
    }

    const grandTotal = netBalanceAfterDeposit + preLitigationDefaultInterest;

    // 6. Build Table Rows
    let rowsHtml = '';

    // Row 1: Base Debt
    rowsHtml += `
      <tr>
        <td><strong>1. ยอดหนี้ก่อนส่งฟ้องตั้งต้น</strong></td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>${formatCurrency(preDebt)}</td>
        <td>-</td>
        <td><strong>${formatCurrency(preDebt)}</strong></td>
      </tr>
    `;

    // Row 2: Contract Penalty (if any)
    if (grossPenalty > 0) {
      rowsHtml += `
        <tr class="payment-row">
          <td><strong>2. ค่าปรับตามสัญญา</strong></td>
          <td>${penaltyLabelText}</td>
          <td>${penaltyType === 'daily' ? totalDays + ' วัน' : totalMonths + ' เดือน'}</td>
          <td>${contractPenaltyRate}% ต่อเดือน</td>
          <td>-</td>
          <td style="color: var(--accent-rose); font-weight:600;">+${formatCurrency(grossPenalty)}</td>
          <td><strong>${formatCurrency(preDebt + grossPenalty)}</strong></td>
        </tr>
      `;
    }

    // Row 3: Security Deposit Deduction (if any)
    if (securityDeposit > 0) {
      rowsHtml += `
        <tr style="background: rgba(225, 29, 72, 0.04);">
          <td><strong>3. หักเงินประกันสัญญา</strong></td>
          <td>หักลบเงินประกันสัญญาเช่า</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
          <td style="color: #dc2626; font-weight:600;">-${formatCurrency(securityDeposit)}</td>
          <td><strong>${formatCurrency(netBalanceAfterDeposit)}</strong></td>
        </tr>
      `;
    }

    // Row 4: Pre-Litigation Default Interest at 5% p.a.
    rowsHtml += `
      <tr>
        <td><strong>4. ดอกเบี้ยผิดนัดก่อนฟ้อง (5% ต่อปี)</strong></td>
        <td>${formatDateThai(defaultDateStr)} - ${formatDateThai(filingDateStr)}</td>
        <td>${preLitCalcMode === 'monthly' ? totalMonths + ' เดือน' : totalDays + ' วัน'}</td>
        <td>5.0% ต่อปี</td>
        <td>${formatCurrency(netBalanceAfterDeposit)}</td>
        <td style="color: var(--accent-amber); font-weight:600;">+${formatCurrency(preLitigationDefaultInterest)} <span style="font-size:0.75rem;">(5% ต่อปี)</span></td>
        <td style="color: var(--primary-gold); font-weight:700;"><strong>${formatCurrency(grandTotal)}</strong></td>
      </tr>
    `;

    // Summary Row
    rowsHtml += `
      <tr style="background: rgba(59, 130, 246, 0.08); font-weight: 700;">
        <td colspan="4" style="text-align: right; color: var(--primary-blue);">รวมยอดหนี้ส่งฟ้องกฎหมาย (หลังหักเงินประกัน + ดอกเบี้ยผิดนัด 5% ต่อปี):</td>
        <td>${formatCurrency(preDebt)}</td>
        <td style="color: var(--accent-amber);">${formatCurrency((grossPenalty - securityDeposit) + preLitigationDefaultInterest)}</td>
        <td style="color: var(--primary-gold); font-size: 1.05rem;">${formatCurrency(grandTotal)}</td>
      </tr>
    `;

    if (tbody) tbody.innerHTML = rowsHtml;

    // Update Card Summaries
    const summaryPreDebt = document.getElementById('summaryPreLitigationDebt');
    if (summaryPreDebt) summaryPreDebt.innerText = formatCurrency(preDebt);

    const summaryPenalty = document.getElementById('summaryPreLitigationPenalty');
    if (summaryPenalty) summaryPenalty.innerText = formatCurrency(grossPenalty - securityDeposit);

    const summaryGrand = document.getElementById('summaryPreLitigationGrandTotal');
    if (summaryGrand) summaryGrand.innerText = formatCurrency(grandTotal);

    return { preDebt, effectivePenalty: grossPenalty - securityDeposit, totalAccruedInterest: preLitigationDefaultInterest, grandTotal };
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

    // Render Pre-Litigation Calculation Ledger Table & Get Results
    const preLitRes = renderPreLitigationLedger() || {};

    const preDebtorName = document.getElementById('preLitigationDebtorName')?.value || document.getElementById('defendantName')?.value || '-';
    const preNotes = document.getElementById('preLitigationNotes')?.value || '';

    const displayPreDebtor = document.getElementById('displayPreLitigationDebtor');
    const displayPreDebt = document.getElementById('displayPreLitigationDebt');
    const displayRentPenalty = document.getElementById('displayRentalPenaltyFee');
    const displayPreTotal = document.getElementById('displayPreLitigationTotal');
    const displayPreNotes = document.getElementById('displayPreLitigationNotes');

    if (displayPreDebtor) displayPreDebtor.innerText = `👤 ลูกหนี้ / ผู้เช่า: ${preDebtorName}`;
    if (displayPreDebt) displayPreDebt.innerText = formatCurrency(preLitRes.preDebt || 0);
    if (displayRentPenalty) displayRentPenalty.innerText = formatCurrency(preLitRes.effectivePenalty || 0);
    if (displayPreTotal) displayPreTotal.innerText = formatCurrency(preLitRes.grandTotal || 0);
    if (displayPreNotes) displayPreNotes.innerText = preNotes ? `หมายเหตุส่งฟ้อง: ${preNotes}` : '';

    if (!calcTargetDateStr || interestStages.length === 0) return;

    let currentPrincipal = principalInit;
    let accruedInterestTotal = 0;
    let accruedFeesTotal = courtFee + attorneyFee;
    let totalPaid = 0;
    let totalDaysCalculated = 0;

    let ledgerRows = [];

    const defDateStr = document.getElementById('defaultDate')?.value || document.getElementById('filingDate')?.value || (interestStages[0] && interestStages[0].startDate);
    const curDate = parseDateLocal(defDateStr) || parseDateLocal(interestStages[0]?.startDate);
    let targetDate = parseDateLocal(calcTargetDateStr);

    if (!targetDate) {
      targetDate = new Date();
      if (document.getElementById('calcTargetDate')) {
        document.getElementById('calcTargetDate').value = formatDateIso(targetDate);
      }
    }

    if (!curDate || !targetDate || curDate > targetDate) {
      renderSummary(currentPrincipal + accruedFeesTotal, currentPrincipal, 0, accruedFeesTotal, 0, 0, calcTargetDateStr, principalInit);
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

    const isPrelit = first['category'] === 'prelit' || 
                     first['ยอดหนี้ก่อนส่งฟ้อง'] !== undefined || 
                     first['ยอดหนี้ก่อนฟ้อง'] !== undefined || 
                     first['อัตราดอกเบี้ยก่อนฟ้อง'] !== undefined || 
                     first['preLitigationDebt'] !== undefined || 
                     (!first['หมายเลขคดีดำ'] && !first['caseBlackNo'] && !first['คดีดำ']);

    let debtorObj = {
      category: isPrelit ? 'prelit' : 'court',
      caseBlackNo: first['หมายเลขคดีดำ'] || first['caseBlackNo'] || first['คดีดำ'] || '',
      caseRedNo: first['หมายเลขคดีแดง'] || first['caseRedNo'] || first['คดีแดง'] || '',
      plaintiffName: first['ชื่อโจทก์'] || first['plaintiffName'] || first['โจทก์'] || '',
      defendantName: first['ชื่อจำเลย'] || first['defendantName'] || first['จำเลย'] || '',
      principalAmount: parseFloat(first['เงินต้นฟ้อง'] || first['เงินต้น'] || first['principalAmount']) || 100000,
      defaultDate: first['วันผิดนัดชำระ'] || first['วันผิดนัด'] || first['defaultDate'] || '2020-01-01',
      filingDate: first['วันเสนอเรื่อง'] || first['วันฟ้องคดี'] || first['วันฟ้อง'] || first['filingDate'] || '2021-01-01',
      judgmentDate: first['วันพิพากษา'] || first['judgmentDate'] || '',
      courtFeeAwarded: (parseFloat(first['ค่าธรรมเนียมศาลและค่าทนายความ'] || first['ค่าธรรมเนียมศาล'] || first['courtFeeAwarded']) || 0) + (parseFloat(first['ค่าทนายความ'] || first['attorneyFeeAwarded']) || 0),
      attorneyFeeAwarded: 0,
      preLitigationDebtorName: first['ชื่อลูกหนี้'] || first['ผู้เช่า'] || first['preLitigationDebtor'] || first['ชื่อจำเลย'] || '',
      preLitigationDebt: parseFloat(first['ยอดหนี้ก่อนส่งฟ้อง'] || first['ยอดหนี้ก่อนฟ้อง'] || first['ยอดหนี้'] || first['preLitigationDebt']) || 0,
      preLitigationInterestRate: parseFloat(first['อัตราดอกเบี้ยก่อนฟ้อง'] || first['preLitigationInterestRate']) || 1.5,
      rentalPenaltyType: first['รูปแบบค่าปรับ'] || first['rentalPenaltyType'] || 'flat',
      rentalPenaltyFee: parseFloat(first['ค่าปรับสัญญาเช่า'] || first['คิดค่าปรับ'] || first['ค่าปรับค่าเช่า'] || first['ค่าปรับ'] || first['rentalPenaltyFee']) || 0,
      securityDeposit: parseFloat(first['เงินประกันสัญญา'] || first['เงินประกัน'] || first['securityDeposit']) || 0,
      preLitigationNotes: first['หมายเหตุส่งฟ้อง'] || first['หมายเหตุสัญญาเช่า'] || first['preLitigationNotes'] || '',
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
    const totalFeeInput = (data.courtFeeAwarded !== undefined ? parseFloat(data.courtFeeAwarded) || 0 : 0) + (data.attorneyFeeAwarded !== undefined ? parseFloat(data.attorneyFeeAwarded) || 0 : 0);
    if (document.getElementById('courtFeeAwarded')) document.getElementById('courtFeeAwarded').value = totalFeeInput;

    const debtorNameVal = data.preLitigationDebtorName || data.preLitigationDebtor || data.defendantName || '';
    if (document.getElementById('preLitigationDebtorName')) document.getElementById('preLitigationDebtorName').value = debtorNameVal;
    if (document.getElementById('defendantName')) document.getElementById('defendantName').value = debtorNameVal;

    if (data.preLitigationDebt !== undefined && document.getElementById('preLitigationDebt')) {
      document.getElementById('preLitigationDebt').value = formatNumberWithCommas(data.preLitigationDebt);
    }
    if (data.preLitigationInterestRate !== undefined && document.getElementById('preLitigationInterestRate')) {
      document.getElementById('preLitigationInterestRate').value = data.preLitigationInterestRate;
    }
    if (data.rentalPenaltyType !== undefined && document.getElementById('rentalPenaltyType')) {
      document.getElementById('rentalPenaltyType').value = data.rentalPenaltyType;
    }
    if (data.rentalPenaltyFee !== undefined && document.getElementById('rentalPenaltyFee')) {
      document.getElementById('rentalPenaltyFee').value = formatNumberWithCommas(data.rentalPenaltyFee);
    }
    if (data.securityDeposit !== undefined && document.getElementById('securityDeposit')) {
      document.getElementById('securityDeposit').value = formatNumberWithCommas(data.securityDeposit);
    }
    if (data.defaultDate) {
      if (document.getElementById('defaultDate')) document.getElementById('defaultDate').value = data.defaultDate;
      if (document.getElementById('preLitDefaultDate')) document.getElementById('preLitDefaultDate').value = data.defaultDate;
    }
    if (data.filingDate) {
      if (document.getElementById('filingDate')) document.getElementById('filingDate').value = data.filingDate;
      if (document.getElementById('preLitFilingDate')) document.getElementById('preLitFilingDate').value = data.filingDate;
    }
    if (data.preLitigationNotes !== undefined && document.getElementById('preLitigationNotes')) {
      document.getElementById('preLitigationNotes').value = data.preLitigationNotes;
    }
    if (data.principalAmount !== undefined && document.getElementById('principalAmount')) {
      document.getElementById('principalAmount').value = formatNumberWithCommas(data.principalAmount);
    }
    if (data.courtFeeAwarded !== undefined && document.getElementById('courtFeeAwarded')) {
      document.getElementById('courtFeeAwarded').value = formatNumberWithCommas(data.courtFeeAwarded);
    }

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

    // Auto-focus and highlight relevant section based on category
    const isPrelit = (data.category || (data.caseBlackNo ? 'court' : 'prelit')) === 'prelit';
    currentCaseCategory = isPrelit ? 'prelit' : 'court';

    setTimeout(() => {
      if (isPrelit) {
        const targetElem = document.getElementById('preLitigationDebtorName') || document.querySelector('.pre-litigation-card');
        if (targetElem) {
          const cardBox = targetElem.closest('.card') || targetElem;
          cardBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
          cardBox.style.transition = 'all 0.4s ease';
          cardBox.style.outline = '3px solid #2563eb';
          cardBox.style.boxShadow = '0 0 20px rgba(37,99,235,0.45)';
          setTimeout(() => {
            cardBox.style.outline = '';
            cardBox.style.boxShadow = '';
          }, 2500);
        }
      } else {
        const targetElem = document.getElementById('caseBlackNo') || document.getElementById('courtForm');
        if (targetElem) {
          const cardBox = targetElem.closest('.card') || targetElem;
          cardBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
          cardBox.style.transition = 'all 0.4s ease';
          cardBox.style.outline = '3px solid #d97706';
          cardBox.style.boxShadow = '0 0 20px rgba(217,119,6,0.45)';
          setTimeout(() => {
            cardBox.style.outline = '';
            cardBox.style.boxShadow = '';
          }, 2500);
        }
      }
    }, 150);
  }

  if (btnDownloadCsvTemplate) {
    btnDownloadCsvTemplate.addEventListener('click', () => {
      const csvContent = `หมายเลขคดีดำ,หมายเลขคดีแดง,ชื่อโจทก์,ชื่อจำเลย,ยอดหนี้ก่อนฟ้อง,คิดค่าปรับ,เงินประกันสัญญา,หมายเหตุส่งฟ้อง,เงินต้นฟ้อง,วันผิดนัด,วันฟ้อง,วันพิพากษา,ค่าธรรมเนียมศาลและค่าทนายความ,วันที่ชำระเงิน,จำนวนเงินชำระ,หมายเหตุ
พ. 101/2565,พ. 505/2565,บริษัท พัฒนาอสังหา จำกัด,นายสมคิด มั่งมี,250000,15000,50000,ค้างชำระค่าเช่า 3 งวด + ค่าปรับผิดนัดตามสัญญาเช่า,250000,2020-01-01,2021-01-01,2021-06-01,11000,2021-08-15,20000,ผ่อนชำระงวดที่ 1
พ. 101/2565,พ. 505/2565,บริษัท พัฒนาอสังหา จำกัด,นายสมคิด มั่งมี,250000,15000,50000,ค้างชำระค่าเช่า 3 งวด + ค่าปรับผิดนัดตามสัญญาเช่า,250000,2020-01-01,2021-01-01,2021-06-01,11000,2022-02-10,35000,ผ่อนชำระงวดที่ 2`;
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
        preLitigationDebt: 180000,
        rentalPenaltyFee: 12000,
        preLitigationNotes: "ค้างชำระค่าเช่าตามสัญญาเช่าพื้นที่",
        defaultDate: "2020-03-01",
        filingDate: "2021-02-01",
        judgmentDate: "2021-07-01",
        courtFeeAwarded: 7500,
        attorneyFeeAwarded: 0,
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

  const getApiUrl = () => {
    const origin = window.location.origin;
    let pathname = window.location.pathname || '/';
    if (pathname.endsWith('.html') || pathname.endsWith('.htm')) {
      pathname = pathname.substring(0, pathname.lastIndexOf('/') + 1);
    }
    const base = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    return `${origin}${base}/api/cases`;
  };

  const API = getApiUrl();

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

  // ─── Safe Fetch Helper ────────────────────────────────────────────
  async function fetchJson(url, options = {}) {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      console.error('[Fetch Non-JSON Response]', url, res.status, text);
      throw new Error(`เซิร์ฟเวอร์ตอบกลับผิดพลาด (HTTP ${res.status}): โปรดรัน pm2 restart debt-interest`);
    }
    const json = await res.json();
    return json;
  }

  // ─── Local Storage Database Fallback ─────────────────────────────
  function getLocalCases() {
    try {
      return JSON.parse(localStorage.getItem('debtor_cases_db') || '[]');
    } catch {
      return [];
    }
  }

  function saveLocalCase(payload) {
    const cases = getLocalCases();
    const todayStr = new Date().toISOString().split('T')[0];

    const debtorName = (payload.defendantName || payload.preLitigationDebtor || '').trim().toLowerCase();
    let existingIndex = -1;

    if (debtorName) {
      existingIndex = cases.findIndex(c => {
        const name = (c.defendantName || c.preLitigationDebtor || '').trim().toLowerCase();
        return name === debtorName;
      });
    }

    if (existingIndex !== -1) {
      cases[existingIndex] = {
        ...cases[existingIndex],
        ...payload,
        updatedAt: todayStr,
        updated_at: todayStr
      };
      localStorage.setItem('debtor_cases_db', JSON.stringify(cases));
      return cases[existingIndex];
    } else {
      const newCase = {
        id: Date.now(),
        ...payload,
        savedAt: todayStr,
        saved_at: todayStr,
        updatedAt: todayStr,
        updated_at: todayStr
      };
      cases.unshift(newCase);
      localStorage.setItem('debtor_cases_db', JSON.stringify(cases));
      return newCase;
    }
  }

  function deleteLocalCase(id) {
    let cases = getLocalCases();
    cases = cases.filter(c => Number(c.id) !== Number(id));
    localStorage.setItem('debtor_cases_db', JSON.stringify(cases));
  }

  // ─── Badge ────────────────────────────────────────────────────────
  async function updateSavedCasesBadge() {
    let count = 0;
    try {
      const json = await fetchJson(API);
      if (json && json.count !== undefined) {
        count = json.count;
      }
    } catch {
      count = getLocalCases().length;
    }
    if (savedCasesCountBadge) {
      const localCount = getLocalCases().length;
      savedCasesCountBadge.innerText = Math.max(count, localCount);
    }
  }

  // ─── Build current form data object ──────────────────────────────
  let currentCaseCategory = 'prelit';

  function buildCasePayload() {
    const preDebtor = document.getElementById('preLitigationDebtorName')?.value;
    const defName = document.getElementById('defendantName')?.value;
    const blackNo = document.getElementById('caseBlackNo')?.value || '';
    const redNo = document.getElementById('caseRedNo')?.value || '';
    const judgmentDate = document.getElementById('judgmentDate')?.value || '';
    
    // Requirement 4: Automatically convert category to 'court' when court details are populated!
    const isCourtCase = !!(blackNo || redNo || judgmentDate);
    const category = isCourtCase ? 'court' : (currentCaseCategory || 'prelit');
    
    return {
      category,
      caseBlackNo:        blackNo,
      caseRedNo:          redNo,
      plaintiffName:      document.getElementById('plaintiffName')?.value || '',
      defendantName:      defName || preDebtor || '',
      preLitigationDebtor: preDebtor || defName || '',
      preLitigationRate:  parseFloat(document.getElementById('preLitigationInterestRate')?.value) || 1.5,
      rentalPenaltyType:  document.getElementById('rentalPenaltyType')?.value || 'flat',
      principalAmount:    parseFormattedNumber(document.getElementById('principalAmount')?.value) || parseFormattedNumber(document.getElementById('preLitigationDebt')?.value) || 0,
      defaultDate:        document.getElementById('defaultDate')?.value  || '',
      filingDate:         document.getElementById('filingDate')?.value   || '',
      judgmentDate:       judgmentDate,
      courtFeeAwarded:    parseFormattedNumber(document.getElementById('courtFeeAwarded')?.value) || 0,
      attorneyFeeAwarded: 0,
      preLitigationDebt:  parseFormattedNumber(document.getElementById('preLitigationDebt')?.value) || 0,
      rentalPenaltyFee:   parseFormattedNumber(document.getElementById('rentalPenaltyFee')?.value) || 0,
      securityDeposit:    parseFormattedNumber(document.getElementById('securityDeposit')?.value) || 0,
      preLitigationNotes: document.getElementById('preLitigationNotes')?.value || '',
      interestStages:     [...interestStages],
      partialPayments:    [...partialPayments]
    };
  }

  // ─── Save (POST) ──────────────────────────────────────────────────
  async function saveCurrentCase() {
    const payload = buildCasePayload();
    const defendant = payload.defendantName || payload.preLitigationDebtor || 'ไม่ระบุ';
    const caseNo    = payload.caseBlackNo   || '-';

    // 1. ลองบันทึกลง Server API
    try {
      const json = await fetchJson(API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      });
    } catch (err) {
      console.warn('[Server Save Failed -> Fallback to Local Storage]', err.message);
    }

    // 2. บันทึกลง Local Storage เสมอเพื่อความชัวร์ 100%
    saveLocalCase(payload);
    showToast(`✅ บันทึกข้อมูลลูกหนี้ (${defendant}) เรียบร้อยแล้ว!`);

    await updateSavedCasesBadge();
    await renderSavedCasesTable();
  }

  let currentSavedCasesFilter = 'all';

  async function renderSavedCasesTable() {
    if (!savedCasesTableBody) return;

    let cases = [];
    try {
      const json = await fetchJson(API);
      if (json && json.data) cases = json.data;
    } catch {
      cases = [];
    }

    // รวมข้อมูลจาก Local Storage ด้วย
    const localCases = getLocalCases();
    localCases.forEach(lc => {
      if (!cases.some(c => c.id === lc.id)) {
        cases.unshift(lc);
      }
    });

    const searchInput = document.getElementById('inputSearchSavedCases');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    if (currentSavedCasesFilter !== 'all') {
      cases = cases.filter(c => (c.category || (c.caseBlackNo ? 'court' : 'prelit')) === currentSavedCasesFilter);
    }

    if (query) {
      cases = cases.filter(c => {
        const debtor = (c.preLitigationDebtor || c.defendantName || '').toLowerCase();
        const plaintiff = (c.plaintiffName || '').toLowerCase();
        const black = (c.caseBlackNo || '').toLowerCase();
        const red = (c.caseRedNo || '').toLowerCase();
        const notes = (c.preLitigationNotes || '').toLowerCase();

        return debtor.includes(query) || plaintiff.includes(query) || black.includes(query) || red.includes(query) || notes.includes(query);
      });
    }

    if (cases.length === 0) {
      const msg = query ? `ไม่พบข้อมูลลูกหนี้ที่ตรงกับคำค้นหา "${searchInput.value}"` : 'ไม่พบรายการลูกหนี้ในหมวดหมู่นี้';
      savedCasesTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;">${msg}</td></tr>`;
      return;
    }

    savedCasesTableBody.innerHTML = '';
    cases.forEach(c => {
      const isPrelit = (c.category || (c.caseBlackNo ? 'court' : 'prelit')) === 'prelit';
      const catBadge = isPrelit
        ? `<span style="background: rgba(59,130,246,0.12); color: #1d4ed8; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">⚖️ ก่อนฟ้อง</span>`
        : `<span style="background: rgba(217,119,6,0.12); color: #b45309; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">🏛️ ชั้นคดี</span>`;

      const debtorDisplayName = c.preLitigationDebtor || c.defendantName || '-';
      const principalVal = isPrelit ? (c.preLitigationDebt || c.principalAmount || 0) : (c.principalAmount || 0);
      const totalVal = isPrelit
        ? (c.preLitigationDebt || c.principalAmount || 0) + (c.rentalPenaltyFee || 0)
        : (c.principalAmount || 0) + (c.courtFeeAwarded || 0);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div>${catBadge}</div>
          <div style="font-weight: 600; font-size: 0.82rem; margin-top: 2px;">
            ${c.caseBlackNo ? `ดำ ${c.caseBlackNo}` : '-'} ${c.caseRedNo ? `/ แดง ${c.caseRedNo}` : ''}
          </div>
        </td>
        <td>
          <div style="font-weight:700; color: #1e3a8a;">${debtorDisplayName}</div>
          <div style="font-size:0.78rem;color:var(--text-muted);">${c.plaintiffName ? 'เจ้าหนี้: ' + c.plaintiffName : (c.preLitigationNotes || 'ลูกหนี้ก่อนฟ้อง')}</div>
        </td>
        <td style="font-weight:600;">${formatCurrency(principalVal)}</td>
        <td style="color:var(--gold);font-weight:700;">${formatCurrency(totalVal)}</td>
        <td style="font-size:0.8rem;">${formatDateThai(c.savedAt || c.saved_at)}</td>
        <td style="text-align:center;white-space:nowrap;">
          <button type="button" class="btn btn-outline-gold load-saved-case" data-id="${c.id}" style="padding:4px 10px;font-size:0.8rem;font-weight:600;" title="ดึงข้อมูลลูกหนี้รายนี้ขึ้นมาคำนวณและแสดงผลบนฟอร์ม">
            <i data-lucide="folder-open"></i> โหลดเข้าฟอร์ม
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
          const json = await fetchJson(`${API}/${id}`);
          if (json && json.success) {
            applyImportedData(json.data);
            closeSavedCasesModal();
            showToast('✅ โหลดข้อมูลคดีเรียบร้อยแล้ว');
            return;
          }
        } catch {}

        // Fallback load local
        const localData = getLocalCases().find(item => Number(item.id) === id);
        if (localData) {
          applyImportedData(localData);
          closeSavedCasesModal();
          showToast('✅ โหลดข้อมูลคดีเรียบร้อยแล้ว');
        } else {
          showToast('❌ โหลดข้อมูลไม่สำเร็จ', 'error');
        }
      });
    });

    savedCasesTableBody.querySelectorAll('.delete-saved-case').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = Number(e.currentTarget.getAttribute('data-id'));
        if (!confirm('คุณต้องการลบคดีนี้หรือไม่?')) return;
        
        try {
          await fetchJson(`${API}/${id}`, { method: 'DELETE' });
        } catch {}

        deleteLocalCase(id);
        showToast('🗑️ ลบคดีเรียบร้อยแล้ว');
        await updateSavedCasesBadge();
        await renderSavedCasesTable();
      });
    });
  }

  function openSavedCasesModal(categoryFilter) {
    if (savedCasesModal) {
      if (typeof categoryFilter === 'string') {
        currentSavedCasesFilter = categoryFilter;
        document.querySelectorAll('.btn-filter-case').forEach(b => {
          if (b.getAttribute('data-filter') === categoryFilter) {
            b.classList.add('active');
          } else {
            b.classList.remove('active');
          }
        });
      }
      renderSavedCasesTable();
      savedCasesModal.style.setProperty('display', 'flex', 'important');
    }
  }

  function closeSavedCasesModal() {
    if (savedCasesModal) {
      savedCasesModal.style.setProperty('display', 'none', 'important');
    }
  }

  const btnSavePreLitigation = document.getElementById('btnSavePreLitigation');
  const btnSavePreLitigationSummary = document.getElementById('btnSavePreLitigationSummary');

  async function savePreLitigationCase() {
    const debtorName = document.getElementById('preLitigationDebtorName')?.value?.trim() || document.getElementById('defendantName')?.value?.trim();
    if (!debtorName) {
      alert('⚠️ โปรดระบุ "ชื่อลูกหนี้ / ผู้เช่า (Debtor Name)" ก่อนบันทึกส่งฝ่ายกฎหมาย');
      document.getElementById('preLitigationDebtorName')?.focus();
      return;
    }
    await saveCurrentCase();
    showToast(`⚖️ บันทึกข้อมูลลูกหนี้ (${debtorName}) ส่งฝ่ายกฎหมายเรียบร้อยแล้ว!`);
  }

  if (btnOpenSavedCasesModal)  btnOpenSavedCasesModal.addEventListener('click', () => openSavedCasesModal());
  if (btnCloseSavedCasesModal) btnCloseSavedCasesModal.addEventListener('click', closeSavedCasesModal);
  if (btnCloseSavedCases)      btnCloseSavedCases.addEventListener('click', closeSavedCasesModal);
  if (btnSaveCurrentCase)      btnSaveCurrentCase.addEventListener('click', saveCurrentCase);
  if (btnModalSaveCurrentCase) btnModalSaveCurrentCase.addEventListener('click', saveCurrentCase);
  if (btnSavePreLitigation)        btnSavePreLitigation.addEventListener('click', savePreLitigationCase);
  if (btnSavePreLitigationSummary) btnSavePreLitigationSummary.addEventListener('click', savePreLitigationCase);

  updateSavedCasesBadge();

  // Auto-format money input fields with commas and 2 decimals on blur/input
  const moneyInputIds = [
    'preLitigationDebt', 'rentalPenaltyFee', 'securityDeposit', 'principalAmount', 'courtFeeAwarded',
    'newPreLitigationDebt', 'newRentalPenaltyFee', 'newSecurityDeposit', 'newPrincipalAmount'
  ];

  moneyInputIds.forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('blur', () => {
      if (input.value !== '') {
        input.value = formatNumberWithCommas(input.value);
      }
      calculateAndRender();
    });
    input.addEventListener('focus', () => {
      if (input.value !== '') {
        input.value = String(parseFormattedNumber(input.value));
        input.select();
      }
    });
    input.addEventListener('input', () => {
      calculateAndRender();
    });
  });

  // Sync date fields between Pre-Litigation Card and Court Case Card
  const preLitDefaultDate = document.getElementById('preLitDefaultDate');
  const preLitFilingDate = document.getElementById('preLitFilingDate');
  const defaultDateInput = document.getElementById('defaultDate');
  const filingDateInput = document.getElementById('filingDate');

  if (preLitDefaultDate && defaultDateInput) {
    preLitDefaultDate.addEventListener('change', () => {
      defaultDateInput.value = preLitDefaultDate.value;
      calculateAndRender();
    });
    defaultDateInput.addEventListener('change', () => {
      preLitDefaultDate.value = defaultDateInput.value;
      calculateAndRender();
    });
  }

  if (preLitFilingDate && filingDateInput) {
    preLitFilingDate.addEventListener('change', () => {
      filingDateInput.value = preLitFilingDate.value;
      calculateAndRender();
    });
    filingDateInput.addEventListener('change', () => {
      preLitFilingDate.value = filingDateInput.value;
      calculateAndRender();
    });
  }

  // Clear form data handler
  function clearAllFormData() {
    if (document.getElementById('preLitigationDebtorName')) document.getElementById('preLitigationDebtorName').value = '';
    if (document.getElementById('preLitigationDebt')) document.getElementById('preLitigationDebt').value = '';
    if (document.getElementById('preLitigationInterestRate')) document.getElementById('preLitigationInterestRate').value = '1.5';
    if (document.getElementById('rentalPenaltyType')) document.getElementById('rentalPenaltyType').value = 'flat';
    if (document.getElementById('rentalPenaltyFee')) document.getElementById('rentalPenaltyFee').value = '';
    if (document.getElementById('preLitigationNotes')) document.getElementById('preLitigationNotes').value = '';
    if (document.getElementById('preLitDefaultDate')) document.getElementById('preLitDefaultDate').value = '2020-01-01';
    if (document.getElementById('preLitFilingDate')) document.getElementById('preLitFilingDate').value = '2021-01-01';

    if (document.getElementById('caseBlackNo')) document.getElementById('caseBlackNo').value = '';
    if (document.getElementById('caseRedNo')) document.getElementById('caseRedNo').value = '';
    if (document.getElementById('plaintiffName')) document.getElementById('plaintiffName').value = '';
    if (document.getElementById('defendantName')) document.getElementById('defendantName').value = '';
    if (document.getElementById('principalAmount')) document.getElementById('principalAmount').value = '';
    if (document.getElementById('defaultDate')) document.getElementById('defaultDate').value = '2020-01-01';
    if (document.getElementById('filingDate')) document.getElementById('filingDate').value = '2021-01-01';
    if (document.getElementById('judgmentDate')) document.getElementById('judgmentDate').value = '2021-06-01';
    if (document.getElementById('courtFeeAwarded')) document.getElementById('courtFeeAwarded').value = '';

    partialPayments = [];
    renderPayments();
    applyPreset('legal2021');
    calculateAndRender();

    showToast('🧹 ล้างข้อมูลเรียบร้อยแล้ว');
  }

  const btnClearPreLitigationForm = document.getElementById('btnClearPreLitigationForm');
  if (btnClearPreLitigationForm) {
    btnClearPreLitigationForm.addEventListener('click', clearAllFormData);
  }

  // Rental penalty type select dropdown listener
  const rentalPenaltyTypeSelect = document.getElementById('rentalPenaltyType');
  if (rentalPenaltyTypeSelect) {
    rentalPenaltyTypeSelect.addEventListener('change', () => {
      const val = rentalPenaltyTypeSelect.value;
      const penaltyInput = document.getElementById('rentalPenaltyFee');
      const rateInput = document.getElementById('preLitigationInterestRate');

      if (val === 'daily' || val === 'monthly') {
        preLitCalcMode = val;
        if (penaltyInput) penaltyInput.value = '0.00';
        if (rateInput && (!rateInput.value || parseFloat(rateInput.value) === 0)) {
          rateInput.value = '1.5';
        }
      } else if (val === 'flat') {
        preLitCalcMode = 'flat';
        if (rateInput) rateInput.value = '0';
      }
      syncPreLitCalcModeButtons();
      calculateAndRender();
    });
  }

  function syncPreLitCalcModeButtons() {
    const btnDaily = document.getElementById('btnPreLitCalcModeDaily');
    const btnMonthly = document.getElementById('btnPreLitCalcModeMonthly');
    const btnFlat = document.getElementById('btnPreLitCalcModeFlat');

    btnDaily?.classList.remove('active');
    btnMonthly?.classList.remove('active');
    btnFlat?.classList.remove('active');

    if (preLitCalcMode === 'flat') {
      btnFlat?.classList.add('active');
    } else if (preLitCalcMode === 'monthly') {
      btnMonthly?.classList.add('active');
    } else {
      btnDaily?.classList.add('active');
    }
  }

  // Saved Cases Search & Filter Handlers
  const inputSearchSavedCases = document.getElementById('inputSearchSavedCases');
  if (inputSearchSavedCases) {
    inputSearchSavedCases.addEventListener('input', () => {
      renderSavedCasesTable();
    });
  }

  document.querySelectorAll('.btn-filter-case').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-filter-case').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentSavedCasesFilter = e.currentTarget.getAttribute('data-filter') || 'all';
      renderSavedCasesTable();
    });
  });

  // --- Add New Debtor Modal Handlers & Category Switching ---
  const addDebtorModal = document.getElementById('addDebtorModal');
  const btnOpenAddDebtorModal = document.getElementById('btnOpenAddDebtorModal');
  const btnCloseAddDebtorModal = document.getElementById('btnCloseAddDebtorModal');
  const btnCancelAddDebtor = document.getElementById('btnCancelAddDebtor');
  const quickAddDebtorForm = document.getElementById('quickAddDebtorForm');

  const catPreLitRadio = document.getElementById('catPreLit');
  const catCourtRadio = document.getElementById('catCourt');
  const lblCatPreLit = document.getElementById('lblCatPreLit');
  const lblCatCourt = document.getElementById('lblCatCourt');
  const rowCourtCaseNumbers = document.getElementById('rowCourtCaseNumbers');
  const rowPreLitigationDetails = document.getElementById('rowPreLitigationDetails');
  const lblNewDebtorName = document.getElementById('lblNewDebtorName');
  const lblNewPrincipal = document.getElementById('lblNewPrincipal');
  const lblNewFilingDate = document.getElementById('lblNewFilingDate');

  const newRentalPenaltyType = document.getElementById('newRentalPenaltyType');
  const lblNewRentalPenaltyFee = document.getElementById('lblNewRentalPenaltyFee');

  if (newRentalPenaltyType && lblNewRentalPenaltyFee) {
    newRentalPenaltyType.addEventListener('change', () => {
      const val = newRentalPenaltyType.value;
      const newPenaltyInput = document.getElementById('newRentalPenaltyFee');
      const newRateInput = document.getElementById('newPreLitigationRate');

      if (val === 'daily') {
        lblNewRentalPenaltyFee.innerText = 'อัตราค่าปรับสัญญาเช่ารายวัน (บาท/วัน)';
        if (newPenaltyInput) newPenaltyInput.value = '0.00';
        if (newRateInput && (!newRateInput.value || parseFloat(newRateInput.value) === 0)) {
          newRateInput.value = '1.5';
        }
      } else if (val === 'monthly') {
        lblNewRentalPenaltyFee.innerText = 'อัตราค่าปรับสัญญาเช่ารายเดือน (บาท/เดือน)';
        if (newPenaltyInput) newPenaltyInput.value = '0.00';
        if (newRateInput && (!newRateInput.value || parseFloat(newRateInput.value) === 0)) {
          newRateInput.value = '1.5';
        }
      } else {
        lblNewRentalPenaltyFee.innerText = 'จำนวนเงินค่าปรับสัญญาเช่า (เหมาจ่ายต่อวัน - บาท)';
        if (newRateInput) newRateInput.value = '0';
      }
      updatePreLitigationFieldStates();
    });
  }

  // Dynamic field graying out function
  function updatePreLitigationFieldStates() {
    // 1. Main Form
    const penaltyType = document.getElementById('rentalPenaltyType')?.value || 'flat';
    const rateInput = document.getElementById('preLitigationInterestRate');
    const feeInput = document.getElementById('rentalPenaltyFee');
    const depositInput = document.getElementById('securityDeposit');

    // Security deposit is ALWAYS ENABLED (Editable White Field)
    if (depositInput) {
      depositInput.disabled = false;
      depositInput.readOnly = false;
      depositInput.classList.remove('disabled-field');
      depositInput.setAttribute('style', 'background-color: #ffffff !important; color: #0f172a !important; cursor: text !important; pointer-events: auto !important;');
    }

    if (penaltyType === 'flat') {
      // Flat mode: feeInput is ENABLED, rateInput is DISABLED (Gray)
      if (feeInput) {
        feeInput.disabled = false;
        feeInput.readOnly = false;
        feeInput.classList.remove('disabled-field');
        feeInput.setAttribute('style', 'background-color: #ffffff !important; color: #0f172a !important; cursor: text !important; pointer-events: auto !important;');
      }
      if (rateInput) {
        rateInput.value = '0';
        rateInput.disabled = true;
        rateInput.readOnly = true;
        rateInput.classList.add('disabled-field');
        rateInput.setAttribute('style', 'background-color: #e2e8f0 !important; color: #64748b !important; border-color: #cbd5e1 !important; cursor: not-allowed !important; pointer-events: none !important;');
      }
    } else {
      // Daily/Monthly mode: rateInput is ENABLED (White), feeInput is DISABLED (Gray)
      if (feeInput) {
        feeInput.value = '0.00';
        feeInput.disabled = true;
        feeInput.readOnly = true;
        feeInput.classList.add('disabled-field');
        feeInput.setAttribute('style', 'background-color: #e2e8f0 !important; color: #64748b !important; border-color: #cbd5e1 !important; cursor: not-allowed !important; pointer-events: none !important;');
      }
      if (rateInput) {
        rateInput.disabled = false;
        rateInput.readOnly = false;
        rateInput.classList.remove('disabled-field');
        rateInput.setAttribute('style', 'background-color: #ffffff !important; color: #0f172a !important; cursor: text !important; pointer-events: auto !important;');
        if (!rateInput.value || parseFloat(rateInput.value) === 0) {
          rateInput.value = '1.5';
        }
      }
    }

    // 2. Modal Form
    const newPenaltyType = document.getElementById('newRentalPenaltyType')?.value || 'flat';
    const newRateInput = document.getElementById('newPreLitigationRate');
    const newFeeInput = document.getElementById('newRentalPenaltyFee');
    const newDepositInput = document.getElementById('newSecurityDeposit');

    // Security deposit is ALWAYS ENABLED (Editable White Field)
    if (newDepositInput) {
      newDepositInput.disabled = false;
      newDepositInput.readOnly = false;
      newDepositInput.classList.remove('disabled-field');
      newDepositInput.setAttribute('style', 'background-color: #ffffff !important; color: #0f172a !important; cursor: text !important; pointer-events: auto !important;');
    }

    if (newPenaltyType === 'flat') {
      if (newFeeInput) {
        newFeeInput.disabled = false;
        newFeeInput.readOnly = false;
        newFeeInput.classList.remove('disabled-field');
        newFeeInput.setAttribute('style', 'background-color: #ffffff !important; color: #0f172a !important; cursor: text !important; pointer-events: auto !important;');
      }
      if (newRateInput) {
        newRateInput.value = '0';
        newRateInput.disabled = true;
        newRateInput.readOnly = true;
        newRateInput.classList.add('disabled-field');
        newRateInput.setAttribute('style', 'background-color: #e2e8f0 !important; color: #64748b !important; border-color: #cbd5e1 !important; cursor: not-allowed !important; pointer-events: none !important;');
      }
    } else {
      if (newFeeInput) {
        newFeeInput.value = '0.00';
        newFeeInput.disabled = true;
        newFeeInput.readOnly = true;
        newFeeInput.classList.add('disabled-field');
        newFeeInput.setAttribute('style', 'background-color: #e2e8f0 !important; color: #64748b !important; border-color: #cbd5e1 !important; cursor: not-allowed !important; pointer-events: none !important;');
      }
      if (newRateInput) {
        newRateInput.disabled = false;
        newRateInput.readOnly = false;
        newRateInput.classList.remove('disabled-field');
        newRateInput.setAttribute('style', 'background-color: #ffffff !important; color: #0f172a !important; cursor: text !important; pointer-events: auto !important;');
        if (!newRateInput.value || parseFloat(newRateInput.value) === 0) {
          newRateInput.value = '1.5';
        }
      }
    }
  }

  // Input event guards
  const preLitRateElem = document.getElementById('preLitigationInterestRate');
  if (preLitRateElem) {
    preLitRateElem.addEventListener('input', () => {
      const mode = document.getElementById('rentalPenaltyType')?.value || 'flat';
      if (mode === 'flat') {
        preLitRateElem.value = '0';
        updatePreLitigationFieldStates();
      }
    });
  }

  const preLitPenaltyElem = document.getElementById('rentalPenaltyFee');
  if (preLitPenaltyElem) {
    preLitPenaltyElem.addEventListener('input', () => {
      const mode = document.getElementById('rentalPenaltyType')?.value || 'flat';
      if (mode === 'daily' || mode === 'monthly') {
        preLitPenaltyElem.value = '0.00';
        updatePreLitigationFieldStates();
      }
    });
  }

  const secPreLitForm = document.getElementById('secPreLitForm');
  const secCourtForm = document.getElementById('secCourtForm');
  const btnSubmitAddDebtor = document.getElementById('btnSubmitAddDebtor');

  function updateAddDebtorCategoryUI() {
    if (catPreLitRadio && catPreLitRadio.checked) {
      selectedAddCategory = 'prelit';
      if (lblCatPreLit) {
        lblCatPreLit.style.borderColor = '#1d4ed8';
        lblCatPreLit.style.background = 'rgba(59,130,246,0.08)';
      }
      if (lblCatCourt) {
        lblCatCourt.style.borderColor = '#cbd5e1';
        lblCatCourt.style.background = '#fff';
      }
      if (secPreLitForm) secPreLitForm.style.display = 'block';
      if (secCourtForm) secCourtForm.style.display = 'none';
      if (btnSubmitAddDebtor) btnSubmitAddDebtor.innerHTML = '⚖️ บันทึกข้อมูลลูกหนี้ก่อนฟ้อง';
    } else {
      selectedAddCategory = 'court';
      if (lblCatCourt) {
        lblCatCourt.style.borderColor = '#1d4ed8';
        lblCatCourt.style.background = 'rgba(59,130,246,0.08)';
      }
      if (lblCatPreLit) {
        lblCatPreLit.style.borderColor = '#cbd5e1';
        lblCatPreLit.style.background = '#fff';
      }
      if (secPreLitForm) secPreLitForm.style.display = 'none';
      if (secCourtForm) secCourtForm.style.display = 'block';
      if (btnSubmitAddDebtor) btnSubmitAddDebtor.innerHTML = '🏛️ บันทึกข้อมูลลูกหนี้คดี';
    }
  }

  if (catPreLitRadio) catPreLitRadio.addEventListener('change', updateAddDebtorCategoryUI);
  if (catCourtRadio) catCourtRadio.addEventListener('change', updateAddDebtorCategoryUI);

  function openAddDebtorModal() {
    if (addDebtorModal) {
      addDebtorModal.classList.add('active');
      addDebtorModal.style.setProperty('display', 'flex', 'important');
      updateAddDebtorCategoryUI();
      document.getElementById('newDebtorName')?.focus();
    }
  }

  function closeAddDebtorModal() {
    if (addDebtorModal) {
      addDebtorModal.classList.remove('active');
      addDebtorModal.style.setProperty('display', 'none', 'important');
    }
  }

  if (btnOpenAddDebtorModal) btnOpenAddDebtorModal.addEventListener('click', openAddDebtorModal);
  if (btnCloseAddDebtorModal) btnCloseAddDebtorModal.addEventListener('click', closeAddDebtorModal);
  if (btnCancelAddDebtor) btnCancelAddDebtor.addEventListener('click', closeAddDebtorModal);

  if (quickAddDebtorForm) {
    quickAddDebtorForm.addEventListener('submit', (e) => {
      e.preventDefault();
      currentCaseCategory = selectedAddCategory;

      if (selectedAddCategory === 'prelit') {
        const debtorName = document.getElementById('newDebtorName')?.value || 'ลูกหนี้ก่อนฟ้อง';
        const preLitDebt = parseFormattedNumber(document.getElementById('newPreLitigationDebt')?.value) || 0;
        const preLitRate = parseFloat(document.getElementById('newPreLitigationRate')?.value) || 1.5;
        const rentPenaltyType = document.getElementById('newRentalPenaltyType')?.value || 'flat';
        const rentPenalty = parseFormattedNumber(document.getElementById('newRentalPenaltyFee')?.value) || 0;
        const securityDeposit = parseFormattedNumber(document.getElementById('newSecurityDeposit')?.value) || 0;
        const preLitNotes = document.getElementById('newPreLitigationNotes')?.value || '';
        const defaultDate = document.getElementById('newDefaultDate')?.value || '2020-01-01';
        const filingDate = document.getElementById('newFilingDate')?.value || '2021-01-01';

        if (document.getElementById('preLitigationDebtorName')) document.getElementById('preLitigationDebtorName').value = debtorName;
        if (document.getElementById('preLitigationDebt')) document.getElementById('preLitigationDebt').value = formatNumberWithCommas(preLitDebt);
        if (document.getElementById('preLitigationInterestRate')) document.getElementById('preLitigationInterestRate').value = preLitRate;
        if (document.getElementById('rentalPenaltyType')) document.getElementById('rentalPenaltyType').value = rentPenaltyType;
        if (document.getElementById('rentalPenaltyFee')) document.getElementById('rentalPenaltyFee').value = formatNumberWithCommas(rentPenalty);
        if (document.getElementById('securityDeposit')) document.getElementById('securityDeposit').value = formatNumberWithCommas(securityDeposit);
        if (document.getElementById('preLitigationNotes')) document.getElementById('preLitigationNotes').value = preLitNotes;
        document.getElementById('defaultDate').value = defaultDate;
        document.getElementById('filingDate').value = filingDate;
        document.getElementById('defendantName').value = debtorName;
        document.getElementById('principalAmount').value = formatNumberWithCommas(preLitDebt);

        applyPreset('legal2021');
        calculateAndRender();
        saveCurrentCase();
        closeAddDebtorModal();
        quickAddDebtorForm.reset();
        showToast(`⚖️ บันทึกข้อมูลลูกหนี้ก่อนฟ้อง (${debtorName}) เรียบร้อยแล้ว`);
      } else {
        const debtorName = document.getElementById('newCourtDefendantName')?.value || 'จำเลย';
        const plaintiffName = document.getElementById('newCourtPlaintiffName')?.value || '';
        const caseBlackNo = document.getElementById('newCaseBlackNo')?.value || '';
        const caseRedNo = document.getElementById('newCaseRedNo')?.value || '';
        const principalAmt = parseFormattedNumber(document.getElementById('newPrincipalAmount')?.value) || 100000;
        const defaultDate = document.getElementById('newCourtDefaultDate')?.value || '2020-01-01';
        const filingDate = document.getElementById('newCourtFilingDate')?.value || '2021-01-01';
        const preset = document.getElementById('newInterestPreset')?.value || 'legal2021';

        document.getElementById('defendantName').value = debtorName;
        if (plaintiffName) document.getElementById('plaintiffName').value = plaintiffName;
        if (caseBlackNo) document.getElementById('caseBlackNo').value = caseBlackNo;
        if (caseRedNo) document.getElementById('caseRedNo').value = caseRedNo;
        document.getElementById('principalAmount').value = principalAmt;
        document.getElementById('defaultDate').value = defaultDate;
        document.getElementById('filingDate').value = filingDate;

        currentPreset = preset;
        applyPreset(preset);
        partialPayments = [];
        renderPayments();
        calculateAndRender();
        saveCurrentCase();
        closeAddDebtorModal();
        quickAddDebtorForm.reset();
        showToast(`🏛️ บันทึกข้อมูลลูกหนี้คดี (${debtorName}) เรียบร้อยแล้ว`);
      }
    });
  }

  // --- Pre-Litigation Debtor Import Modal Handlers ---
  const preLitigationImportModal = document.getElementById('preLitigationImportModal');
  const btnOpenPreLitigationImport = document.getElementById('btnOpenPreLitigationImport');
  const btnClosePreLitigationImportModal = document.getElementById('btnClosePreLitigationImportModal');
  const btnCancelPreLitImport = document.getElementById('btnCancelPreLitImport');
  const btnChoosePreLitFile = document.getElementById('btnChoosePreLitFile');
  const fileInputPreLitigation = document.getElementById('fileInputPreLitigation');
  const btnDownloadPreLitCsvTemplate = document.getElementById('btnDownloadPreLitCsvTemplate');
  const preLitImportPreviewContainer = document.getElementById('preLitImportPreviewContainer');
  const selectPreLitImportedDebtor = document.getElementById('selectPreLitImportedDebtor');
  const btnApplyPreLitSelectedDebtor = document.getElementById('btnApplyPreLitSelectedDebtor');

  let preLitImportedDebtorsList = [];

  function openPreLitImportModal() {
    if (preLitigationImportModal) {
      preLitigationImportModal.classList.add('active');
      preLitigationImportModal.style.setProperty('display', 'flex', 'important');
    }
  }

  function closePreLitImportModal() {
    if (preLitigationImportModal) {
      preLitigationImportModal.classList.remove('active');
      preLitigationImportModal.style.setProperty('display', 'none', 'important');
    }
  }

  if (btnOpenPreLitigationImport) {
    btnOpenPreLitigationImport.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPreLitImportModal();
    });
  }
  if (btnClosePreLitigationImportModal) btnClosePreLitigationImportModal.addEventListener('click', closePreLitImportModal);
  if (btnCancelPreLitImport) btnCancelPreLitImport.addEventListener('click', closePreLitImportModal);

  if (btnChoosePreLitFile && fileInputPreLitigation) {
    btnChoosePreLitFile.addEventListener('click', () => fileInputPreLitigation.click());
  }

  function downloadPreLitCsvTemplate() {
    const csvContent = '\uFEFF' + `ชื่อลูกหนี้,ยอดหนี้ก่อนส่งฟ้อง,อัตราดอกเบี้ยก่อนฟ้อง,รูปแบบค่าปรับ,ค่าปรับสัญญาเช่า,เงินประกันสัญญา,วันผิดนัดชำระ,วันเสนอเรื่อง,หมายเหตุส่งฟ้อง
นายสมคิด มั่งมี,250000,1.5,daily,500,50000,2020-01-01,2021-01-01,ค้างชำระค่าเช่า 3 งวด + ค่าปรับผิดนัดรายวัน
บริษัท พัฒนาอสังหา จำกัด,450000,1.5,flat,25000,100000,2019-06-01,2020-12-01,ค้างชำระค่าเช่าพื้นที่อาคารพาณิชย์
บริษัท สยามการค้า จำกัด,180000,1.5,monthly,2500,30000,2022-03-01,2023-01-01,ค้างชำระค่าเช่ารายเดือน`;
    downloadFile(csvContent, 'Pre_Litigation_Debtors_Template.csv', 'text/csv;charset=utf-8;');
  }

  function downloadCourtCsvTemplate() {
    const csvContent = '\uFEFF' + `หมายเลขคดีดำ,หมายเลขคดีแดง,ชื่อโจทก์,ชื่อจำเลย,เงินต้นฟ้อง,วันผิดนัดชำระ,วันฟ้องคดี,วันอ่านคำพิพากษา,ค่าธรรมเนียมศาลและทนาย
ผบ. 123/2565,ผบ. 456/2565,ธนาคารพาณิชย์ จำกัด,นายอนันต์ มีทรัพย์,150000,2020-01-01,2021-01-01,2021-06-01,7500
พ. 789/2566,พ. 999/2566,บริษัท ลีสซิ่ง จำกัด,นายวิชัย สมบูรณ์,320000,2021-05-01,2022-03-01,2022-09-01,12000`;
    downloadFile(csvContent, 'Court_Cases_Template.csv', 'text/csv;charset=utf-8;');
  }

  const btnChoosePreLitImportFile = document.getElementById('btnChoosePreLitImportFile');
  const btnChooseCourtImportFile = document.getElementById('btnChooseCourtImportFile');
  const btnDownloadCourtCsvTemplate = document.getElementById('btnDownloadCourtCsvTemplate');

  if (btnChoosePreLitImportFile && fileInput) {
    btnChoosePreLitImportFile.addEventListener('click', () => fileInput.click());
  }

  if (btnChooseCourtImportFile && fileInput) {
    btnChooseCourtImportFile.addEventListener('click', () => fileInput.click());
  }

  if (btnDownloadPreLitCsvTemplate) {
    btnDownloadPreLitCsvTemplate.addEventListener('click', downloadPreLitCsvTemplate);
  }

  if (btnDownloadCourtCsvTemplate) {
    btnDownloadCourtCsvTemplate.addEventListener('click', downloadCourtCsvTemplate);
  }

  if (fileInputPreLitigation) {
    fileInputPreLitigation.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target.result;
        preLitImportedDebtorsList = [];

        if (file.name.endsWith('.json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
          try {
            const parsed = JSON.parse(text);
            preLitImportedDebtorsList = Array.isArray(parsed) ? parsed : [parsed];
          } catch (err) {
            alert('❌ ไฟล์ JSON ไม่ถูกต้อง: ' + err.message);
            return;
          }
        } else {
          const parsedCsv = parseCsvData(text);
          if (parsedCsv && parsedCsv.rows.length > 0) {
            preLitImportedDebtorsList = parsedCsv.rows.map(r => ({
              preLitigationDebtorName: r['ชื่อลูกหนี้'] || r['ผู้เช่า'] || r['ชื่อจำเลย'] || 'ลูกหนี้ก่อนฟ้อง',
              preLitigationDebt: parseFloat(r['ยอดหนี้ก่อนส่งฟ้อง'] || r['ยอดหนี้']) || 0,
              preLitigationInterestRate: parseFloat(r['อัตราดอกเบี้ยก่อนฟ้อง']) || 1.5,
              rentalPenaltyType: r['รูปแบบค่าปรับ'] || 'flat',
              rentalPenaltyFee: parseFloat(r['ค่าปรับสัญญาเช่า'] || r['คิดค่าปรับ']) || 0,
              securityDeposit: parseFloat(r['เงินประกันสัญญา'] || r['เงินประกัน'] || r['securityDeposit']) || 0,
              defaultDate: r['วันผิดนัดชำระ'] || r['วันผิดนัด'] || '2020-01-01',
              filingDate: r['วันเสนอเรื่อง'] || r['วันฟ้องคดี'] || '2021-01-01',
              preLitigationNotes: r['หมายเหตุส่งฟ้อง'] || ''
            }));
          }
        }

        if (preLitImportedDebtorsList.length === 0) {
          alert('ไม่พบข้อมูลรายการลูกหนี้ในไฟล์');
          return;
        }

        if (preLitImportedDebtorsList.length === 1) {
          applyPreLitDebtorToForm(preLitImportedDebtorsList[0]);
          closePreLitImportModal();
          showToast('📥 นำเข้าข้อมูลลูกหนี้เรียบร้อยแล้ว');
        } else {
          if (selectPreLitImportedDebtor && preLitImportPreviewContainer) {
            selectPreLitImportedDebtor.innerHTML = preLitImportedDebtorsList.map((d, idx) => `
              <option value="${idx}">
                [${idx + 1}] ${d.preLitigationDebtorName || d.defendantName || 'ลูกหนี้'} - ยอดหนี้: ${formatCurrency(d.preLitigationDebt || d.principalAmount || 0)}
              </option>
            `).join('');
            preLitImportPreviewContainer.style.display = 'block';
          }
        }
      };
      reader.readAsText(file, 'UTF-8');
      fileInputPreLitigation.value = '';
    });
  }

  function applyPreLitDebtorToForm(d) {
    if (!d) return;
    if (d.preLitigationDebtorName || d.defendantName) {
      document.getElementById('preLitigationDebtorName').value = d.preLitigationDebtorName || d.defendantName;
    }
    if (d.preLitigationDebt !== undefined || d.principalAmount !== undefined) {
      document.getElementById('preLitigationDebt').value = formatNumberWithCommas(d.preLitigationDebt !== undefined ? d.preLitigationDebt : d.principalAmount);
    }
    if (d.preLitigationInterestRate !== undefined) {
      document.getElementById('preLitigationInterestRate').value = d.preLitigationInterestRate;
    }
    if (d.rentalPenaltyType !== undefined) {
      document.getElementById('rentalPenaltyType').value = d.rentalPenaltyType;
    }
    if (d.rentalPenaltyFee !== undefined) {
      document.getElementById('rentalPenaltyFee').value = formatNumberWithCommas(d.rentalPenaltyFee);
    }
    if (d.securityDeposit !== undefined && document.getElementById('securityDeposit')) {
      document.getElementById('securityDeposit').value = formatNumberWithCommas(d.securityDeposit);
    }
    if (d.defaultDate) {
      document.getElementById('defaultDate').value = d.defaultDate;
    }
    if (d.filingDate) {
      document.getElementById('filingDate').value = d.filingDate;
    }
    if (d.preLitigationNotes !== undefined) {
      document.getElementById('preLitigationNotes').value = d.preLitigationNotes;
    }

    calculateAndRender();
  }

  if (btnApplyPreLitSelectedDebtor) {
    btnApplyPreLitSelectedDebtor.addEventListener('click', () => {
      const idx = parseInt(selectPreLitImportedDebtor.value, 10);
      if (!isNaN(idx) && preLitImportedDebtorsList[idx]) {
        applyPreLitDebtorToForm(preLitImportedDebtorsList[idx]);
        closePreLitImportModal();
        showToast('📥 โหลดข้อมูลลูกหนี้ลงฟอร์มเรียบร้อยแล้ว');
      }
    });
  }

  // 8. Event Listeners Setup
  // 7. Print Pre-Litigation Report for Legal Dept
  function printPreLitigationReport() {
    const preDebtor = document.getElementById('preLitigationDebtorName')?.value || document.getElementById('defendantName')?.value || '-';
    const plaintiff = document.getElementById('plaintiffName')?.value || '-';
    const preDebt = parseFormattedNumber(document.getElementById('preLitigationDebt')?.value) || 0;
    const rentPenalty = parseFormattedNumber(document.getElementById('rentalPenaltyFee')?.value) || 0;
    const deposit = parseFormattedNumber(document.getElementById('securityDeposit')?.value) || 0;
    const preRate = parseFloat(document.getElementById('preLitigationInterestRate')?.value) || 1.5;
    const defaultDateStr = document.getElementById('defaultDate')?.value || '-';
    const filingDateStr = document.getElementById('filingDate')?.value || todayStr;
    const notes = document.getElementById('preLitigationNotes')?.value || '-';

    const tbody = document.getElementById('preLitigationTableBody');
    const tableHtml = tbody ? tbody.innerHTML : '';

    const printWin = window.open('', '_blank', 'width=900,height=750');
    if (!printWin) {
      alert('กรุณาอนุญาตให้เปิด Pop-up เพื่อพิมพ์เอกสารรายงานเสนอเรื่องส่งฝ่ายกฎหมาย');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>สรุปข้อมูลเสนอเรื่องดำเนินคดีส่งฝ่ายกฎหมาย - ${preDebtor}</title>
        <style>
          body { font-family: 'Sarabun', 'Segoe UI', Tahoma, sans-serif; padding: 2rem; color: #1e293b; line-height: 1.6; }
          h1 { text-align: center; color: #1e3a8a; font-size: 1.5rem; margin-bottom: 0.25rem; }
          .sub-header { text-align: center; color: #64748b; font-size: 0.95rem; margin-bottom: 1.5rem; }
          .info-box { background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 1.25rem; margin-bottom: 1.5rem; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.95rem; }
          .summary-cards { display: grid; grid-template-columns: repeat(${deposit > 0 ? 4 : 3}, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
          .card-box { border: 1px solid #cbd5e1; padding: 1rem; border-radius: 8px; background: #fff; text-align: center; }
          .card-title { font-size: 0.82rem; color: #64748b; font-weight: bold; }
          .card-val { font-size: 1.3rem; font-weight: bold; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.9rem; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          th { background: #1e3a8a; color: #fff; font-weight: 600; }
          .footer-sig { margin-top: 3rem; display: flex; justify-content: space-between; text-align: center; font-size: 0.95rem; }
          .sig-line { border-top: 1px dashed #94a3b8; width: 220px; margin-top: 2.5rem; padding-top: 6px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>บันทึกข้อความเสนอเรื่องดำเนินคดีส่งฝ่ายกฎหมาย</h1>
        <div class="sub-header">สรุปภาระหนี้ผิดนัดชำระและคำนวณดอกเบี้ยก่อนส่งฟ้อง | วันที่จัดทำ: ${formatDateThai(todayStr)}</div>

        <div class="info-box">
          <div class="info-grid">
            <div><strong>ชื่อลูกหนี้ / ผู้เช่า:</strong> ${preDebtor}</div>
            <div><strong>โจทก์ / ผู้ให้เช่า:</strong> ${plaintiff}</div>
            <div><strong>วันผิดนัดชำระ:</strong> ${formatDateThai(defaultDateStr)}</div>
            <div><strong>วันเสนอส่งฟ้อง:</strong> ${formatDateThai(filingDateStr)}</div>
            <div><strong>อัตราดอกเบี้ยก่อนฟ้อง:</strong> ${preRate}% ต่อเดือน</div>
            <div><strong>เงินประกันสัญญา:</strong> ${formatCurrency(deposit)}</div>
            <div style="grid-column: span 2;"><strong>หมายเหตุส่งฟ้อง:</strong> ${notes}</div>
          </div>
        </div>

        <h3 style="color: #1e3a8a; margin-bottom: 0.5rem;">สรุปภาระหนี้เสนอส่งฟ้อง</h3>
        <div class="summary-cards">
          <div class="card-box">
            <div class="card-title">ยอดหนี้ค้างชำระก่อนฟ้อง</div>
            <div class="card-val" style="color: #0f172a;">${formatCurrency(preDebt)}</div>
          </div>
          <div class="card-box">
            <div class="card-title">คิดค่าปรับ (เฉพาะค่าเช่า)</div>
            <div class="card-val" style="color: #e11d48;">${formatCurrency(rentPenalty)}</div>
          </div>
          ${deposit > 0 ? `
          <div class="card-box" style="border-color: #dc2626; background: #fef2f2;">
            <div class="card-title" style="color: #dc2626;">หักเงินประกันสัญญา</div>
            <div class="card-val" style="color: #dc2626;">-${formatCurrency(deposit)}</div>
          </div>
          ` : ''}
          <div class="card-box" style="border-color: #d97706; background: #fffbeb;">
            <div class="card-title" style="color: #d97706;">ยอดรวมส่งฟ้องกฎหมาย</div>
            <div class="card-val" style="color: #d97706;">${document.getElementById('displayPreLitigationTotal')?.innerText || '0.00 ฿'}</div>
          </div>
        </div>

        <h3 style="color: #1e3a8a; margin-bottom: 0.5rem;">ตารางรายละเอียดการคำนวณผิดนัดชำระก่อนส่งฟ้อง</h3>
        <table>
          <thead>
            <tr>
              <th>ลำดับ / รายการ</th>
              <th>ช่วงวันที่ผิดนัด</th>
              <th>ระยะเวลา</th>
              <th>อัตรา (%)</th>
              <th>ยอดหนี้ตั้งต้น (บาท)</th>
              <th>ดอกเบี้ย / ค่าปรับช่วงก่อนฟ้อง (บาท)</th>
              <th>ยอดรวมค้างชำระก่อนฟ้อง (บาท)</th>
            </tr>
          </thead>
          <tbody>
            ${tableHtml}
          </tbody>
        </table>

        <div class="footer-sig">
          <div>
            <div class="sig-line">ลงชื่อ.......................................................</div>
            <div>( ผู้เสนอเรื่องส่งดำเนินคดี )</div>
            <div>วันที่ ........../........../..........</div>
          </div>
          <div>
            <div class="sig-line">ลงชื่อ.......................................................</div>
            <div>( ฝ่ายกฎหมายผู้รับเรื่อง )</div>
            <div>วันที่ ........../........../..........</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.write(htmlContent);
    printWin.document.close();
  }

  const btnPrintPreLitigationReport = document.getElementById('btnPrintPreLitigationReport');
  if (btnPrintPreLitigationReport) {
    btnPrintPreLitigationReport.addEventListener('click', (e) => {
      e.preventDefault();
      printPreLitigationReport();
    });
  }

  const btnPreLitCalcModeDaily = document.getElementById('btnPreLitCalcModeDaily');
  const btnPreLitCalcModeMonthly = document.getElementById('btnPreLitCalcModeMonthly');
  const btnPreLitCalcModeFlat = document.getElementById('btnPreLitCalcModeFlat');

  if (btnPreLitCalcModeDaily) {
    btnPreLitCalcModeDaily.addEventListener('click', (e) => {
      e.preventDefault();
      preLitCalcMode = 'daily';
      btnPreLitCalcModeDaily.classList.add('active');
      btnPreLitCalcModeMonthly?.classList.remove('active');
      btnPreLitCalcModeFlat?.classList.remove('active');
      const penaltySel = document.getElementById('rentalPenaltyType');
      if (penaltySel && penaltySel.value !== 'daily') {
        penaltySel.value = 'daily';
      }
      calculateAndRender();
    });
  }

  if (btnPreLitCalcModeMonthly) {
    btnPreLitCalcModeMonthly.addEventListener('click', (e) => {
      e.preventDefault();
      preLitCalcMode = 'monthly';
      btnPreLitCalcModeMonthly.classList.add('active');
      btnPreLitCalcModeDaily?.classList.remove('active');
      btnPreLitCalcModeFlat?.classList.remove('active');
      const penaltySel = document.getElementById('rentalPenaltyType');
      if (penaltySel && penaltySel.value !== 'monthly') {
        penaltySel.value = 'monthly';
      }
      calculateAndRender();
    });
  }

  if (btnPreLitCalcModeFlat) {
    btnPreLitCalcModeFlat.addEventListener('click', (e) => {
      e.preventDefault();
      preLitCalcMode = 'flat';
      btnPreLitCalcModeFlat.classList.add('active');
      btnPreLitCalcModeDaily?.classList.remove('active');
      btnPreLitCalcModeMonthly?.classList.remove('active');
      const penaltySel = document.getElementById('rentalPenaltyType');
      if (penaltySel && penaltySel.value !== 'flat') {
        penaltySel.value = 'flat';
      }
      calculateAndRender();
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
      const data = buildCasePayload();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `court-interest-calc-${data.caseBlackNo || data.defendantName || 'case'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('📥 ดาวน์โหลดไฟล์สำรอง JSON เรียบร้อยแล้ว!');
    });
  }

  const btnExportCsv = document.getElementById('btnExportCsv');
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', exportCurrentCaseCsv);
  }

  function exportCurrentCaseCsv() {
    const payload = buildCasePayload();
    const headers = [
      'หมายเลขคดีดำ', 'หมายเลขคดีแดง', 'ชื่อโจทก์', 'ชื่อจำเลย', 'ชื่อลูกหนี้ก่อนฟ้อง',
      'ยอดหนี้ก่อนส่งฟ้อง', 'อัตราดอกเบี้ยก่อนฟ้อง', 'รูปแบบค่าปรับ', 'ค่าปรับสัญญาเช่า', 'เงินประกันสัญญา',
      'เงินต้นฟ้อง', 'วันผิดนัดชำระ', 'วันเสนอเรื่อง/วันฟ้องคดี', 'วันอ่านคำพิพากษา',
      'ค่าธรรมเนียมศาลและค่าทนายความ', 'หมายเหตุส่งฟ้อง'
    ];

    const row = [
      `"${payload.caseBlackNo || ''}"`,
      `"${payload.caseRedNo || ''}"`,
      `"${payload.plaintiffName || ''}"`,
      `"${payload.defendantName || ''}"`,
      `"${payload.preLitigationDebtor || ''}"`,
      payload.preLitigationDebt || 0,
      payload.preLitigationRate || 1.5,
      `"${payload.rentalPenaltyType || 'flat'}"`,
      payload.rentalPenaltyFee || 0,
      payload.securityDeposit || 0,
      payload.principalAmount || 0,
      `"${payload.defaultDate || ''}"`,
      `"${payload.filingDate || ''}"`,
      `"${payload.judgmentDate || ''}"`,
      payload.courtFeeAwarded || 0,
      `"${(payload.preLitigationNotes || '').replace(/"/g, '""')}"`
    ];

    const csvContent = '\uFEFF' + headers.join(',') + '\n' + row.join(',');
    const filename = `Case_Backup_${payload.caseBlackNo || payload.defendantName || 'debtor'}.csv`;
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
    showToast('📥 ดาวน์โหลดไฟล์สำรอง CSV เรียบร้อยแล้ว!');
  }

  const btnExportAllSavedCasesCsv = document.getElementById('btnExportAllSavedCasesCsv');
  if (btnExportAllSavedCasesCsv) {
    btnExportAllSavedCasesCsv.addEventListener('click', exportAllSavedCasesCsv);
  }

  async function exportAllSavedCasesCsv() {
    let cases = [];
    try {
      const res = await fetchJson(API);
      if (res && res.success && Array.isArray(res.data)) {
        cases = res.data;
      }
    } catch (e) {
      console.warn('[Fetch Server Cases Failed for CSV Backup -> Fallback to Local Storage]', e);
    }
    const localCases = getLocalCases();
    localCases.forEach(lc => {
      if (!cases.some(c => c.id === lc.id)) cases.unshift(lc);
    });

    if (cases.length === 0) {
      alert('ไม่พบข้อมูลรายการคดีในคลังสำหรับส่งออก CSV');
      return;
    }

    const headers = [
      'ID', 'หมวดหมู่', 'หมายเลขคดีดำ', 'หมายเลขคดีแดง', 'ชื่อโจทก์', 'ชื่อจำเลย/ลูกหนี้',
      'ยอดหนี้ก่อนส่งฟ้อง', 'อัตราดอกเบี้ยก่อนฟ้อง', 'รูปแบบค่าปรับ', 'ค่าปรับสัญญาเช่า', 'เงินประกันสัญญา',
      'เงินต้นฟ้อง', 'วันผิดนัดชำระ', 'วันเสนอเรื่อง/วันฟ้องคดี', 'วันอ่านคำพิพากษา',
      'ค่าธรรมเนียมศาลและทนาย', 'หมายเหตุส่งฟ้อง', 'วันที่บันทึก'
    ];

    const rows = cases.map(c => [
      c.id || '',
      `"${c.category === 'court' ? 'ลูกหนี้คดี' : 'ลูกหนี้ก่อนฟ้อง'}"`,
      `"${c.caseBlackNo || ''}"`,
      `"${c.caseRedNo || ''}"`,
      `"${c.plaintiffName || ''}"`,
      `"${c.preLitigationDebtor || c.defendantName || ''}"`,
      c.preLitigationDebt || 0,
      c.preLitigationRate !== undefined ? c.preLitigationRate : 1.5,
      `"${c.rentalPenaltyType || 'flat'}"`,
      c.rentalPenaltyFee || 0,
      c.securityDeposit || 0,
      c.principalAmount || 0,
      `"${c.defaultDate || ''}"`,
      `"${c.filingDate || ''}"`,
      `"${c.judgmentDate || ''}"`,
      c.courtFeeAwarded || 0,
      `"${(c.preLitigationNotes || '').replace(/"/g, '""')}"`,
      `"${c.savedAt || c.saved_at || ''}"`
    ].join(','));

    const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    const filename = `All_Saved_Cases_Backup_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
    showToast(`📥 ส่งออกไฟล์สำรองคลังคดีทั้งหมด (${cases.length} รายการ) เป็น CSV เรียบร้อยแล้ว!`);
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
      ['change', 'input'].forEach(evt => {
        input.addEventListener(evt, () => {
          calculateAndRender();
        });
      });
    });
  }

  // 8. FINAL INITIALIZATION AT THE VERY END (Guarantees all elements & functions exist!)
  applyPreset('legal2021');
  calculateAndRender();
});
