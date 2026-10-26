/* PRD Search & Filter untuk PRD Studio.
   Pencarian dan filtering lintas proyek berdasarkan keyword,
   industri, status, skor, dan tanggal.
   ES5 murni tanpa bundler. */
(function () {
  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  function searchProjects(projects, query) {
    projects = projects || [];
    query = clean(query).toLowerCase();
    if (!query) return projects.slice();
    return projects.filter(function (p) {
      var haystack = [
        (p.data && p.data.productName) || p.name || '',
        (p.data && p.data.problem) || '',
        (p.data && p.data.mustHave) || '',
        (p.data && p.data.primaryUser) || '',
        (p.data && p.data.industry) || '',
        p.industry || ''
      ].join(' ').toLowerCase();
      return haystack.indexOf(query) > -1;
    });
  }

  function filterByIndustry(projects, industry) {
    if (!industry || industry === 'all') return (projects || []).slice();
    return (projects || []).filter(function (p) {
      var ind = (p.data && p.data.industry) || p.industry || '';
      return ind === industry;
    });
  }

  function filterByStatus(projects, status) {
    if (!status || status === 'all') return (projects || []).slice();
    return (projects || []).filter(function (p) {
      var sc = (typeof p.score === 'number') ? p.score : ((p.lastResult && p.lastResult.score) || 0);
      var st = sc >= 80 ? 'complete' : (sc >= 60 ? 'near' : (sc > 0 ? 'in_progress' : 'not_started'));
      return st === status;
    });
  }

  function filterByScoreRange(projects, min, max) {
    min = (min === undefined) ? 0 : min;
    max = (max === undefined) ? 100 : max;
    return (projects || []).filter(function (p) {
      var sc = (typeof p.score === 'number') ? p.score : ((p.lastResult && p.lastResult.score) || 0);
      return sc >= min && sc <= max;
    });
  }

  function filterByDateRange(projects, fromDate, toDate) {
    return (projects || []).filter(function (p) {
      var dateStr = p.createdAt || p.updatedAt || (p.data && p.data.createdAt) || '';
      if (!dateStr) return true;
      if (fromDate && dateStr < fromDate) return false;
      if (toDate && dateStr > toDate) return false;
      return true;
    });
  }

  function sortProjects(projects, sortBy, order) {
    order = order || 'desc';
    var sorted = (projects || []).slice();
    sorted.sort(function (a, b) {
      var va, vb;
      switch (sortBy) {
        case 'score':
          va = (typeof a.score === 'number') ? a.score : ((a.lastResult && a.lastResult.score) || 0);
          vb = (typeof b.score === 'number') ? b.score : ((b.lastResult && b.lastResult.score) || 0);
          break;
        case 'name':
          va = ((a.data && a.data.productName) || a.name || '').toLowerCase();
          vb = ((b.data && b.data.productName) || b.name || '').toLowerCase();
          break;
        case 'date':
          va = a.createdAt || a.updatedAt || '';
          vb = b.createdAt || b.updatedAt || '';
          break;
        default:
          va = 0; vb = 0;
      }
      if (va < vb) return order === 'asc' ? -1 : 1;
      if (va > vb) return order === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }

  function combinedFilter(projects, opts) {
    opts = opts || {};
    var result = (projects || []).slice();
    if (opts.query) result = searchProjects(result, opts.query);
    if (opts.industry) result = filterByIndustry(result, opts.industry);
    if (opts.status) result = filterByStatus(result, opts.status);
    if (opts.minScore !== undefined || opts.maxScore !== undefined) {
      result = filterByScoreRange(result, opts.minScore, opts.maxScore);
    }
    if (opts.fromDate || opts.toDate) {
      result = filterByDateRange(result, opts.fromDate, opts.toDate);
    }
    if (opts.sortBy) {
      result = sortProjects(result, opts.sortBy, opts.sortOrder);
    }
    return result;
  }

  function highlightMatch(text, query) {
    text = String(text || '');
    query = clean(query);
    if (!query) return text;
    var idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return text.slice(0, idx) + '**' + text.slice(idx, idx + query.length) + '**' + text.slice(idx + query.length);
  }

  window.PRDSearch = {
    searchProjects: searchProjects,
    filterByIndustry: filterByIndustry,
    filterByStatus: filterByStatus,
    filterByScoreRange: filterByScoreRange,
    filterByDateRange: filterByDateRange,
    sortProjects: sortProjects,
    combinedFilter: combinedFilter,
    highlightMatch: highlightMatch
  };
})();
