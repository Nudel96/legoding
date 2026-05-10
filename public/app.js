document.addEventListener('DOMContentLoaded', () => {
  const dealsGrid = document.getElementById('deals-grid');
  const runPipelineBtn = document.getElementById('run-pipeline-btn');
  const scoreFilter = document.getElementById('score-filter');
  const scoreValue = document.getElementById('score-value');
  
  // Update score filter text
  scoreFilter.addEventListener('input', (e) => {
    scoreValue.textContent = `${e.target.value}+`;
  });
  
  // Reload deals when slider is released
  scoreFilter.addEventListener('change', fetchDeals);

  // Run pipeline
  runPipelineBtn.addEventListener('click', async () => {
    runPipelineBtn.innerHTML = '<span class="spinner">↻</span> Suche läuft...';
    runPipelineBtn.disabled = true;
    
    try {
      const res = await fetch('/api/scheduler/run', { method: 'POST' });
      const data = await res.json();
      alert(`Suche beendet! ${data.dealsFound} Deals verarbeitet.`);
      fetchDeals();
      fetchStats();
    } catch (e) {
      alert('Fehler bei der Suche');
      console.error(e);
    } finally {
      runPipelineBtn.innerHTML = 'Suche ausführen';
      runPipelineBtn.disabled = false;
    }
  });

  // Fetch initial data
  fetchStats();
  fetchDeals();

  async function fetchStats() {
    try {
      const res = await fetch('/health');
      const data = await res.json();
      document.getElementById('stat-jobs').textContent = data.stats.jobCount;
      document.getElementById('stat-listings').textContent = data.stats.listingCount;
      document.getElementById('stat-top').textContent = data.stats.highScoreDeals;
    } catch (e) {
      console.error('Failed to fetch stats', e);
    }
  }

  async function fetchDeals() {
    const minScore = scoreFilter.value;
    dealsGrid.innerHTML = '<div class="loading-state">Lade Deals...</div>';
    
    try {
      const res = await fetch(`/api/reviews?minScore=${minScore}`);
      const data = await res.json();
      
      if (data.results.length === 0) {
        dealsGrid.innerHTML = `<div class="loading-state">Keine Deals mit Score >= ${minScore} gefunden.</div>`;
        return;
      }
      
      dealsGrid.innerHTML = data.results.map(renderDealCard).join('');
    } catch (e) {
      dealsGrid.innerHTML = '<div class="loading-state">Fehler beim Laden der Deals. Server läuft?</div>';
      console.error(e);
    }
  }

  function renderDealCard(result) {
    const { listing, valuation, dealReview, catalogMatch } = result;
    
    const scoreClass = dealReview.dealScore >= 80 ? 'score-excellent' 
                     : dealReview.dealScore >= 60 ? 'score-good' 
                     : 'score-okay';
                     
    const profitClass = valuation?.marginPct > 0 ? 'profit-positive' : 'profit-negative';
    const riskClass = dealReview.riskScore > 30 ? 'risk-high' : 'risk-low';
    
    const margin = valuation?.marginPct !== undefined ? `+${valuation.marginPct.toFixed(0)}%` : '?';
    const profitAbs = valuation?.marginAbs !== undefined ? `+${valuation.marginAbs.toFixed(2)}€` : 'Unbekannt';

    return `
      <div class="deal-card">
        <div class="deal-header">
          <div class="score-badge ${scoreClass}">${dealReview.dealScore}</div>
          <div class="deal-type">${catalogMatch?.itemType || 'UNKNOWN'}</div>
        </div>
        
        <h3 class="deal-title" title="${listing.title}">${listing.title}</h3>
        
        <div class="deal-metrics">
          <div class="metric">
            <span class="metric-label">Kaufpreis</span>
            <span class="metric-value">${listing.totalPrice.toFixed(2)}€</span>
          </div>
          <div class="metric">
            <span class="metric-label">Gewinn (Marge)</span>
            <span class="metric-value ${profitClass}">${margin}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Wert (BL)</span>
            <span class="metric-value">${valuation?.estimatedResaleValue?.toFixed(2) || '?'}€</span>
          </div>
          <div class="metric">
            <span class="metric-label">Zustand</span>
            <span class="metric-value" style="font-size: 1rem;">${listing.condition.toUpperCase()}</span>
          </div>
        </div>
        
        <div class="deal-footer">
          <div class="risk-tag ${riskClass}">
            <span>Risiko Score: ${dealReview.riskScore}</span>
          </div>
          <a href="${listing.url}" target="_blank" class="btn buy">
            Zum Angebot auf ${listing.marketplace} ↗
          </a>
        </div>
      </div>
    `;
  }
});
