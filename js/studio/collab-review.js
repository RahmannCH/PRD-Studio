/* PRD Collaboration & Review Mode untuk PRD Studio.
   Review multi-pengguna dengan komentar per bagian, workflow approval
   (draft → review → approved), penugasan reviewer, dan pelacakan sign-off.
   ES5 murni tanpa bundler. */
(function () {
  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  var STATUSES = {
    'draft': { id: 'draft', name: 'Draft', color: '#94a3b8', next: ['review'] },
    'review': { id: 'review', name: 'Dalam Review', color: '#f59e0b', next: ['approved', 'draft'] },
    'approved': { id: 'approved', name: 'Disetujui', color: '#10b981', next: ['draft'] },
    'changes_requested': { id: 'changes_requested', name: 'Perlu Revisi', color: '#ef4444', next: ['draft', 'review'] }
  };

  function createReview(opts) {
    opts = opts || {};
    return {
      id: 'rev-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      prdId: opts.prdId || 'default',
      title: opts.title || 'Review PRD',
      status: 'draft',
      reviewers: [],
      comments: [],
      approvals: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: opts.createdBy || 'user'
    };
  }

  function addReviewer(review, reviewer) {
    if (!review || !reviewer) return review;
    if (review.reviewers.indexOf(reviewer) === -1) review.reviewers.push(reviewer);
    review.updatedAt = new Date().toISOString();
    return review;
  }

  function removeReviewer(review, reviewer) {
    if (!review) return review;
    review.reviewers = (review.reviewers || []).filter(function (r) { return r !== reviewer; });
    review.updatedAt = new Date().toISOString();
    return review;
  }

  function addComment(review, section, author, text, parentId) {
    if (!review) return review;
    var comment = {
      id: 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      section: section || 'general',
      author: author || 'anonymous',
      text: clean(text),
      parentId: parentId || null,
      resolved: false,
      createdAt: new Date().toISOString(),
      replies: []
    };
    if (parentId) {
      // Find parent and add as reply
      var parent = findComment(review.comments, parentId);
      if (parent) {
        if (!parent.replies) parent.replies = [];
        parent.replies.push(comment);
      } else {
        review.comments.push(comment);
      }
    } else {
      review.comments.push(comment);
    }
    review.updatedAt = new Date().toISOString();
    return review;
  }

  function findComment(comments, id) {
    for (var i = 0; i < (comments || []).length; i++) {
      if (comments[i].id === id) return comments[i];
      if (comments[i].replies) {
        var found = findComment(comments[i].replies, id);
        if (found) return found;
      }
    }
    return null;
  }

  function resolveComment(review, commentId) {
    var c = findComment((review || {}).comments, commentId);
    if (c) { c.resolved = true; c.resolvedAt = new Date().toISOString(); }
    if (review) review.updatedAt = new Date().toISOString();
    return review;
  }

  function unresolveComment(review, commentId) {
    var c = findComment((review || {}).comments, commentId);
    if (c) { c.resolved = false; delete c.resolvedAt; }
    if (review) review.updatedAt = new Date().toISOString();
    return review;
  }

  function requestChanges(review, reviewer, reason) {
    if (!review) return review;
    review.status = 'changes_requested';
    review.approvals = (review.approvals || []).filter(function (a) { return a.reviewer !== reviewer; });
    if (reason) addComment(review, 'general', reviewer, 'Perubahan diminta: ' + reason);
    review.updatedAt = new Date().toISOString();
    return review;
  }

  function submitForReview(review) {
    if (!review) return review;
    if (review.status === 'draft' || review.status === 'changes_requested') {
      review.status = 'review';
      review.updatedAt = new Date().toISOString();
    }
    return review;
  }

  function approve(review, reviewer) {
    if (!review) return review;
    if (review.reviewers.indexOf(reviewer) === -1) review.reviewers.push(reviewer);
    var existing = review.approvals.filter(function (a) { return a.reviewer === reviewer; });
    if (!existing.length) {
      review.approvals.push({ reviewer: reviewer, at: new Date().toISOString() });
    }
    // Auto-approve if all reviewers approved
    if (review.approvals.length >= review.reviewers.length && review.reviewers.length > 0) {
      review.status = 'approved';
    }
    review.updatedAt = new Date().toISOString();
    return review;
  }

  function revokeApproval(review, reviewer) {
    if (!review) return review;
    review.approvals = (review.approvals || []).filter(function (a) { return a.reviewer !== reviewer; });
    if (review.status === 'approved') review.status = 'review';
    review.updatedAt = new Date().toISOString();
    return review;
  }

  function canTransition(review, newStatus) {
    if (!review || !STATUSES[review.status]) return false;
    return STATUSES[review.status].next.indexOf(newStatus) > -1;
  }

  function transition(review, newStatus) {
    if (!review || !canTransition(review, newStatus)) return review;
    review.status = newStatus;
    review.updatedAt = new Date().toISOString();
    return review;
  }

  function getUnresolvedComments(review, section) {
    var comments = (review && review.comments) || [];
    var result = [];
    function collect(list) {
      (list || []).forEach(function (c) {
        if (!c.resolved && (!section || c.section === section)) result.push(c);
        if (c.replies) collect(c.replies);
      });
    }
    collect(comments);
    return result;
  }

  function getCommentsBySection(review) {
    var sections = {};
    (review && review.comments || []).forEach(function (c) {
      if (!sections[c.section]) sections[c.section] = [];
      sections[c.section].push(c);
    });
    return sections;
  }

  function reviewSummary(review) {
    if (!review) return null;
    var allComments = [];
    function collect(list) { (list || []).forEach(function (c) { allComments.push(c); if (c.replies) collect(c.replies); }); }
    collect(review.comments);
    return {
      id: review.id,
      title: review.title,
      status: review.status,
      statusName: (STATUSES[review.status] || {}).name || review.status,
      reviewerCount: (review.reviewers || []).length,
      approvalCount: (review.approvals || []).length,
      commentCount: (review.comments || []).length,
      unresolvedCount: allComments.filter(function (c) { return !c.resolved; }).length,
      isFullyApproved: review.status === 'approved',
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    };
  }

  /* ===== Review Store (localStorage) ===== */
  function listReviews(projectId) {
    try {
      var key = 'prd_studio_reviews_' + (projectId || 'default');
      var raw = (window.localStorage && window.localStorage.getItem) ? window.localStorage.getItem(key) : null;
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function saveReview(projectId, review) {
    if (!review) return false;
    try {
      var key = 'prd_studio_reviews_' + (projectId || 'default');
      var list = listReviews(projectId);
      var idx = -1;
      for (var i = 0; i < list.length; i++) { if (list[i].id === review.id) { idx = i; break; } }
      if (idx > -1) list[idx] = review; else list.unshift(review);
      if (list.length > 30) list = list.slice(0, 30);
      if (window.localStorage && window.localStorage.setItem) window.localStorage.setItem(key, JSON.stringify(list));
      return true;
    } catch (e) { return false; }
  }

  function getReview(projectId, id) {
    var list = listReviews(projectId);
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) return list[i]; }
    return null;
  }

  function deleteReview(projectId, id) {
    try {
      var key = 'prd_studio_reviews_' + (projectId || 'default');
      var list = listReviews(projectId).filter(function (r) { return r.id !== id; });
      if (window.localStorage && window.localStorage.setItem) window.localStorage.setItem(key, JSON.stringify(list));
      return true;
    } catch (e) { return false; }
  }

  window.CollabReview = {
    STATUSES: STATUSES,
    createReview: createReview,
    addReviewer: addReviewer,
    removeReviewer: removeReviewer,
    addComment: addComment,
    resolveComment: resolveComment,
    unresolveComment: unresolveComment,
    requestChanges: requestChanges,
    submitForReview: submitForReview,
    approve: approve,
    revokeApproval: revokeApproval,
    canTransition: canTransition,
    transition: transition,
    getUnresolvedComments: getUnresolvedComments,
    getCommentsBySection: getCommentsBySection,
    reviewSummary: reviewSummary,
    findComment: findComment,
    listReviews: listReviews,
    saveReview: saveReview,
    getReview: getReview,
    deleteReview: deleteReview
  };
})();
