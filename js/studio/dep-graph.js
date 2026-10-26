/* PRD Dependency Graph & Critical Path Analyzer untuk PRD Studio.
   Menganalisis dependensi antar task dan menghitung critical path
   (rantai terpanjang dari task yang saling bergantung).
   ES5 murni tanpa bundler. */
(function () {
  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  // Dependency types: 'blocks' (A must finish before B), 'related' (loosely coupled), 'parent' (subtask)
  function createGraph() {
    return { nodes: {}, edges: [] };
  }

  function addNode(graph, id, label, meta) {
    graph = graph || createGraph();
    if (!graph.nodes[id]) {
      graph.nodes[id] = { id: id, label: label || id, meta: meta || {}, status: 'pending' };
    }
    return graph;
  }

  function addEdge(graph, from, to, type) {
    graph = graph || createGraph();
    type = type || 'blocks';
    // Ensure nodes exist
    if (!graph.nodes[from]) addNode(graph, from, from);
    if (!graph.nodes[to]) addNode(graph, to, to);
    // Avoid duplicates
    var exists = graph.edges.some(function (e) { return e.from === from && e.to === to && e.type === type; });
    if (!exists) {
      graph.edges.push({ from: from, to: to, type: type });
    }
    return graph;
  }

  function removeNode(graph, id) {
    graph = graph || createGraph();
    delete graph.nodes[id];
    graph.edges = graph.edges.filter(function (e) { return e.from !== id && e.to !== id; });
    return graph;
  }

  function predecessors(graph, id) {
    graph = graph || createGraph();
    return graph.edges.filter(function (e) { return e.to === id && e.type === 'blocks'; }).map(function (e) { return e.from; });
  }

  function successors(graph, id) {
    graph = graph || createGraph();
    return graph.edges.filter(function (e) { return e.from === id && e.type === 'blocks'; }).map(function (e) { return e.to; });
  }

  function topologicalSort(graph) {
    graph = graph || createGraph();
    var visited = {};
    var result = [];
    var temp = {};
    var hasCycle = false;

    function visit(id) {
      if (visited[id]) return;
      if (temp[id]) { hasCycle = true; return; }
      temp[id] = true;
      var succs = successors(graph, id);
      succs.forEach(function (s) { visit(s); });
      temp[id] = false;
      visited[id] = true;
      result.unshift(id);
    }

    Object.keys(graph.nodes).forEach(function (id) { visit(id); });
    if (hasCycle) return { sorted: [], hasCycle: true };
    return { sorted: result, hasCycle: false };
  }

  function criticalPath(graph, durations) {
    graph = graph || createGraph();
    durations = durations || {};
    var topo = topologicalSort(graph);
    if (topo.hasCycle) return { path: [], length: 0, hasCycle: true };

    // Forward pass: earliest start/finish
    var earliest = {};
    topo.sorted.forEach(function (id) {
      var preds = predecessors(graph, id);
      var maxEF = 0;
      preds.forEach(function (p) {
        var dur = durations[p] || 1;
        var ef = (earliest[p] || 0) + dur;
        if (ef > maxEF) maxEF = ef;
      });
      earliest[id] = maxEF;
    });

    // Backward pass: latest start/finish
    var latest = {};
    var totalDuration = 0;
    topo.sorted.slice().reverse().forEach(function (id) {
      var succs = successors(graph, id);
      if (succs.length === 0) {
        latest[id] = totalDuration || earliest[id];
      } else {
        var minLS = Infinity;
        succs.forEach(function (s) {
          var dur = durations[id] || 1;
          var ls = (latest[s] || 0) - dur;
          if (ls < minLS) minLS = ls;
        });
        latest[id] = minLS === Infinity ? 0 : minLS;
      }
      var ef = earliest[id] + (durations[id] || 1);
      if (ef > totalDuration) totalDuration = ef;
    });

    // Recompute totalDuration properly
    totalDuration = 0;
    topo.sorted.forEach(function (id) {
      var ef = earliest[id] + (durations[id] || 1);
      if (ef > totalDuration) totalDuration = ef;
    });

    // Recompute latest with correct total
    topo.sorted.slice().reverse().forEach(function (id) {
      var succs = successors(graph, id);
      if (succs.length === 0) {
        latest[id] = totalDuration - (durations[id] || 1);
      } else {
        var minLS = Infinity;
        succs.forEach(function (s) {
          var ls = latest[s] - (durations[id] || 1);
          if (ls < minLS) minLS = ls;
        });
        latest[id] = minLS === Infinity ? 0 : minLS;
      }
    });

    // Slack = latest - earliest; zero slack = critical
    var criticalNodes = topo.sorted.filter(function (id) {
      return (latest[id] - earliest[id]) <= 0;
    });

    // Build path
    var path = [];
    criticalNodes.forEach(function (id) {
      path.push({ id: id, label: graph.nodes[id].label, earliest: earliest[id], latest: latest[id], slack: latest[id] - earliest[id] });
    });

    return {
      path: path,
      length: totalDuration,
      totalDuration: totalDuration,
      hasCycle: false,
      earliest: earliest,
      latest: latest
    };
  }

  function analyzeGraph(graph, durations) {
    graph = graph || createGraph();
    durations = durations || {};
    var topo = topologicalSort(graph);
    var cp = criticalPath(graph, durations);
    var nodeCount = Object.keys(graph.nodes).length;
    var edgeCount = graph.edges.length;
    var blocksEdges = graph.edges.filter(function (e) { return e.type === 'blocks'; }).length;

    var inDegree = {};
    Object.keys(graph.nodes).forEach(function (id) { inDegree[id] = 0; });
    graph.edges.forEach(function (e) { if (e.type === 'blocks') inDegree[e.to] = (inDegree[e.to] || 0) + 1; });

    var roots = Object.keys(graph.nodes).filter(function (id) { return inDegree[id] === 0; });
    var leaves = Object.keys(graph.nodes).filter(function (id) { return successors(graph, id).length === 0; });

    return {
      nodeCount: nodeCount,
      edgeCount: edgeCount,
      blocksEdges: blocksEdges,
      hasCycle: topo.hasCycle,
      topologicalOrder: topo.sorted,
      criticalPath: cp,
      roots: roots,
      leaves: leaves,
      maxParallelism: roots.length
    };
  }

  function reportMarkdown(analysis) {
    analysis = analysis || {};
    var lines = [];
    lines.push('# Dependency Graph & Critical Path Report');
    lines.push('');
    lines.push('**Nodes:** ' + (analysis.nodeCount || 0));
    lines.push('**Edges (blocks):** ' + (analysis.blocksEdges || 0));
    lines.push('**Total Duration:** ' + (analysis.criticalPath ? analysis.criticalPath.totalDuration : 0));
    lines.push('**Has Cycle:** ' + (analysis.hasCycle ? 'Ya (circular dependency!)' : 'Tidak'));
    lines.push('');
    if (analysis.criticalPath && analysis.criticalPath.path && analysis.criticalPath.path.length) {
      lines.push('## Critical Path');
      analysis.criticalPath.path.forEach(function (n, i) {
        lines.push((i + 1) + '. ' + n.label + ' (earliest: ' + n.earliest + ', slack: ' + n.slack + ')');
      });
      lines.push('');
    }
    if (analysis.roots && analysis.roots.length) {
      lines.push('## Starting Points (Roots)');
      analysis.roots.forEach(function (r) { lines.push('- ' + (analysis.criticalPath && analysis.criticalPath.path ? '' : '') + r); });
    }
    if (analysis.leaves && analysis.leaves.length) {
      lines.push('');
      lines.push('## End Points (Leaves)');
      analysis.leaves.forEach(function (l) { lines.push('- ' + l); });
    }
    return lines.join('\n');
  }

  window.DepGraph = {
    createGraph: createGraph,
    addNode: addNode,
    addEdge: addEdge,
    removeNode: removeNode,
    predecessors: predecessors,
    successors: successors,
    topologicalSort: topologicalSort,
    criticalPath: criticalPath,
    analyzeGraph: analyzeGraph,
    reportMarkdown: reportMarkdown
  };
})();
