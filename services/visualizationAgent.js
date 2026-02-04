const fs = require('fs').promises;
const path = require('path');

class VisualizationAgent {
  constructor() {
    this.outputDir = './data/visualizations';
    this.cache = new Map();
    this.chartTypes = [
      'bar', 'line', 'pie', 'scatter', 'bubble', 'radar', 
      'heatmap', 'treemap', 'sunburst', 'sankey', 'network',
      'gantt', 'histogram', 'boxplot', 'violin', 'area'
    ];
    this.diagramTypes = [
      'flowchart', 'mindmap', 'orgchart', 'timeline', 
      'process', 'sequence', 'state', 'network', 'tree'
    ];
    this.architectureTypes = [
      'system', 'microservices', 'cloud', 'dataflow', 
      'security', 'deployment', 'infrastructure'
    ];
  }

  // Initialize output directory
  async initialize() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.mkdir(path.join(this.outputDir, 'charts'), { recursive: true });
      await fs.mkdir(path.join(this.outputDir, 'diagrams'), { recursive: true });
      await fs.mkdir(path.join(this.outputDir, 'architectures'), { recursive: true });
      await fs.mkdir(path.join(this.outputDir, 'models'), { recursive: true });
    } catch (error) {
      console.error('❌ Failed to initialize visualization directories:', error);
    }
  }

  // Generate charts from data
  async generateChart(data, options = {}) {
    try {
      const {
        type = 'bar',
        title = 'Data Visualization',
        xField = 'x',
        yField = 'y',
        width = 800,
        height = 600,
        theme = 'default',
        interactive = true,
        exportFormat = 'html'
      } = options;

      if (!this.chartTypes.includes(type)) {
        throw new Error(`Unsupported chart type: ${type}`);
      }

      const chartConfig = this.buildChartConfig(data, type, options);
      const chartHTML = this.generateChartHTML(chartConfig, title, width, height, theme, interactive);
      
      const filename = `chart_${type}_${Date.now()}.${exportFormat}`;
      const filepath = path.join(this.outputDir, 'charts', filename);
      
      await fs.writeFile(filepath, chartHTML);

      return {
        success: true,
        type: 'chart',
        chartType: type,
        filename: filename,
        filepath: filepath,
        config: chartConfig,
        metadata: {
          title: title,
          dimensions: `${width}x${height}`,
          theme: theme,
          interactive: interactive,
          dataPoints: Array.isArray(data) ? data.length : 0
        }
      };
    } catch (error) {
      console.error('❌ Chart generation failed:', error);
      throw error;
    }
  }

  // Build chart configuration
  buildChartConfig(data, type, options) {
    const { xField = 'x', yField = 'y' } = options;
    
    const config = {
      type: type,
      data: {
        labels: data.map(item => item[xField]),
        datasets: [{
          label: options.label || 'Data',
          data: data.map(item => item[yField]),
          backgroundColor: this.generateColors(data.length, 0.6),
          borderColor: this.generateColors(data.length, 1),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: options.showLegend !== false },
          title: { display: !!options.title, text: options.title }
        }
      }
    };

    return config;
  }

  // Generate chart HTML
  generateChartHTML(config, title, width, height, theme, interactive) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: ${width}px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .chart-container { position: relative; height: ${height}px; margin-top: 20px; }
        .title { text-align: center; color: #333; margin-bottom: 20px; }
        .controls { text-align: center; margin-bottom: 20px; }
        .btn { background: #007bff; color: white; border: none; padding: 8px 16px; margin: 0 5px; border-radius: 4px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="title">${title}</h1>
        ${interactive ? `
        <div class="controls">
            <button class="btn" onclick="downloadChart()">Download PNG</button>
            <button class="btn" onclick="resetZoom()">Reset Zoom</button>
        </div>
        ` : ''}
        <div class="chart-container">
            <canvas id="chart"></canvas>
        </div>
    </div>
    <script>
        const config = ${JSON.stringify(config, null, 2)};
        const ctx = document.getElementById('chart').getContext('2d');
        const chart = new Chart(ctx, config);
        
        function downloadChart() {
            const link = document.createElement('a');
            link.download = '${title.replace(/\\s+/g, '_')}.png';
            link.href = chart.toBase64Image();
            link.click();
        }
    </script>
</body>
</html>`;
  }

  // Generate diagrams
  async generateDiagram(data, options = {}) {
    try {
      const {
        type = 'flowchart',
        title = 'Process Diagram',
        layout = 'vertical',
        theme = 'default',
        exportFormat = 'html'
      } = options;

      if (!this.diagramTypes.includes(type)) {
        throw new Error(`Unsupported diagram type: ${type}`);
      }

      const diagramConfig = this.buildDiagramConfig(data, type, options);
      const diagramHTML = this.generateDiagramHTML(diagramConfig, title, theme, layout);
      
      const filename = `diagram_${type}_${Date.now()}.${exportFormat}`;
      const filepath = path.join(this.outputDir, 'diagrams', filename);
      
      await fs.writeFile(filepath, diagramHTML);

      return {
        success: true,
        type: 'diagram',
        diagramType: type,
        filename: filename,
        filepath: filepath,
        config: diagramConfig,
        metadata: {
          title: title,
          layout: layout,
          theme: theme,
          nodes: data.nodes ? data.nodes.length : 0,
          edges: data.edges ? data.edges.length : 0
        }
      };
    } catch (error) {
      console.error('❌ Diagram generation failed:', error);
      throw error;
    }
  }

  // Build diagram configuration
  buildDiagramConfig(data, type, options) {
    return {
      type: type,
      layout: options.layout || 'vertical',
      data: data,
      options: {
        theme: options.theme || 'default',
        showLabels: options.showLabels !== false,
        showArrows: options.showArrows !== false
      }
    };
  }

  // Generate diagram HTML
  generateDiagramHTML(config, title, theme, layout) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script src="https://unpkg.com/@hpcc-js/wasm@0.3.11/dist/index.min.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .title { text-align: center; color: #333; margin-bottom: 20px; }
        .diagram-container { width: 100%; height: 600px; border: 1px solid #ddd; }
        .controls { text-align: center; margin-bottom: 20px; }
        .btn { background: #28a745; color: white; border: none; padding: 8px 16px; margin: 0 5px; border-radius: 4px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="title">${title}</h1>
        <div class="controls">
            <button class="btn" onclick="downloadSVG()">Download SVG</button>
            <button class="btn" onclick="zoomIn()">Zoom In</button>
            <button class="btn" onclick="zoomOut()">Zoom Out</button>
        </div>
        <div class="diagram-container" id="diagram"></div>
    </div>
    <script>
        const config = ${JSON.stringify(config, null, 2)};
        
        function generateDOT(config) {
            let dot = 'digraph { rankdir=${layout === "horizontal" ? "LR" : "TB"}; ';
            dot += 'node [shape=box, style="rounded,filled", fillcolor="#e1f5fe"]; ';
            
            if (config.data.nodes) {
                config.data.nodes.forEach(node => {
                    dot += \`"\${node.id}" [label="\${node.label}"]; \`;
                });
            }
            
            if (config.data.edges) {
                config.data.edges.forEach(edge => {
                    dot += \`"\${edge.from}" -> "\${edge.to}"; \`;
                });
            }
            
            dot += '}';
            return dot;
        }
        
        d3.select("#diagram")
            .graphviz()
            .transition(d3.transition().duration(1000))
            .renderDot(generateDOT(config));
        
        function downloadSVG() {
            const svg = document.querySelector("#diagram svg");
            const svgData = new XMLSerializer().serializeToString(svg);
            const blob = new Blob([svgData], {type: "image/svg+xml"});
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "${title.replace(/\\s+/g, '_')}.svg";
            link.click();
        }
    </script>
</body>
</html>`;
  }

  // Generate architecture diagrams
  async generateArchitecture(data, options = {}) {
    try {
      const {
        type = 'system',
        title = 'System Architecture',
        style = 'modern',
        exportFormat = 'html'
      } = options;

      if (!this.architectureTypes.includes(type)) {
        throw new Error(`Unsupported architecture type: ${type}`);
      }

      const archConfig = this.buildArchitectureConfig(data, type, options);
      const archHTML = this.generateArchitectureHTML(archConfig, title, style);
      
      const filename = `architecture_${type}_${Date.now()}.${exportFormat}`;
      const filepath = path.join(this.outputDir, 'architectures', filename);
      
      await fs.writeFile(filepath, archHTML);

      return {
        success: true,
        type: 'architecture',
        architectureType: type,
        filename: filename,
        filepath: filepath,
        config: archConfig,
        metadata: {
          title: title,
          style: style,
          components: data.components ? data.components.length : 0,
          connections: data.connections ? data.connections.length : 0
        }
      };
    } catch (error) {
      console.error('❌ Architecture generation failed:', error);
      throw error;
    }
  }

  // Build architecture configuration
  buildArchitectureConfig(data, type, options) {
    return {
      type: type,
      style: options.style || 'modern',
      data: data,
      options: {
        showLabels: options.showLabels !== false,
        showConnections: options.showConnections !== false,
        componentStyle: options.componentStyle || 'rounded'
      }
    };
  }

  // Generate architecture HTML
  generateArchitectureHTML(config, title, style) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script src="https://unpkg.com/mermaid@8.14.0/dist/mermaid.min.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1400px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .title { text-align: center; color: #333; margin-bottom: 20px; }
        .architecture-container { width: 100%; height: 800px; border: 1px solid #ddd; }
        .controls { text-align: center; margin-bottom: 20px; }
        .btn { background: #6f42c1; color: white; border: none; padding: 8px 16px; margin: 0 5px; border-radius: 4px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="title">${title}</h1>
        <div class="controls">
            <button class="btn" onclick="downloadSVG()">Download SVG</button>
            <button class="btn" onclick="exportPNG()">Export PNG</button>
            <button class="btn" onclick="resetView()">Reset View</button>
        </div>
        <div class="architecture-container" id="architecture"></div>
    </div>
    <script>
        const config = ${JSON.stringify(config, null, 2)};
        mermaid.initialize({ startOnLoad: false });
        
        function generateMermaidDiagram(config) {
            let diagram = 'graph TB\\n';
            diagram += '    classDef component fill:#e1f5fe,stroke:#01579b,stroke-width:2px;\\n';
            diagram += '    classDef database fill:#f3e5f5,stroke:#4a148c,stroke-width:2px;\\n';
            
            if (config.data.components) {
                config.data.components.forEach(comp => {
                    diagram += \`    \${comp.id}["\${comp.name}"]\\n\`;
                });
            }
            
            if (config.data.connections) {
                config.data.connections.forEach(conn => {
                    diagram += \`    \${conn.from} --> \${conn.to}\\n\`;
                });
            }
            
            return diagram;
        }
        
        async function renderArchitecture() {
            const diagramDefinition = generateMermaidDiagram(config);
            const element = document.getElementById('architecture');
            
            try {
                const { svg } = await mermaid.render('mermaid-diagram', diagramDefinition);
                element.innerHTML = svg;
            } catch (error) {
                console.error('Error rendering diagram:', error);
                element.innerHTML = '<p>Error rendering diagram</p>';
            }
        }
        
        function downloadSVG() {
            const svg = document.querySelector('#architecture svg');
            const svgData = new XMLSerializer().serializeToString(svg);
            const blob = new Blob([svgData], {type: "image/svg+xml"});
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "${title.replace(/\\s+/g, '_')}.svg";
            link.click();
        }
        
        document.addEventListener('DOMContentLoaded', renderArchitecture);
    </script>
</body>
</html>`;
  }

  // Generate 3D models
  async generateModel(data, options = {}) {
    try {
      const {
        type = '3d',
        title = '3D Model',
        format = 'obj',
        exportFormat = 'html'
      } = options;

      const modelConfig = this.buildModelConfig(data, type, options);
      const modelHTML = this.generateModelHTML(modelConfig, title, format);
      
      const filename = `model_${type}_${Date.now()}.${exportFormat}`;
      const filepath = path.join(this.outputDir, 'models', filename);
      
      await fs.writeFile(filepath, modelHTML);

      return {
        success: true,
        type: 'model',
        modelType: type,
        filename: filename,
        filepath: filepath,
        config: modelConfig,
        metadata: {
          title: title,
          format: format,
          vertices: data.vertices ? data.vertices.length : 0,
          faces: data.faces ? data.faces.length : 0
        }
      };
    } catch (error) {
      console.error('❌ Model generation failed:', error);
      throw error;
    }
  }

  // Build model configuration
  buildModelConfig(data, type, options) {
    return {
      type: type,
      format: options.format || 'obj',
      data: data,
      options: {
        showWireframe: options.showWireframe || false,
        showAxes: options.showAxes !== false,
        backgroundColor: options.backgroundColor || '#f0f0f0',
        modelColor: options.modelColor || '#4a90e2'
      }
    };
  }

  // Generate model HTML
  generateModelHTML(config, title, format) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .title { text-align: center; color: #333; margin-bottom: 20px; }
        .model-container { width: 100%; height: 600px; border: 1px solid #ddd; }
        .controls { text-align: center; margin-bottom: 20px; }
        .btn { background: #17a2b8; color: white; border: none; padding: 8px 16px; margin: 0 5px; border-radius: 4px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="title">${title}</h1>
        <div class="controls">
            <button class="btn" onclick="resetCamera()">Reset Camera</button>
            <button class="btn" onclick="toggleWireframe()">Toggle Wireframe</button>
            <button class="btn" onclick="exportModel()">Export Model</button>
        </div>
        <div class="model-container" id="model"></div>
    </div>
    <script>
        const config = ${JSON.stringify(config, null, 2)};
        let scene, camera, renderer, controls, model;
        
        function init() {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(config.options.backgroundColor);
            
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 5;
            
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(document.getElementById('model').clientWidth, document.getElementById('model').clientHeight);
            document.getElementById('model').appendChild(renderer.domElement);
            
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            
            // Add lighting
            const ambientLight = new THREE.AmbientLight(0x404040);
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(1, 1, 1);
            scene.add(directionalLight);
            
            // Create simple geometry if no data provided
            if (!config.data.vertices || config.data.vertices.length === 0) {
                const geometry = new THREE.BoxGeometry(2, 2, 2);
                const material = new THREE.MeshPhongMaterial({ color: config.options.modelColor });
                model = new THREE.Mesh(geometry, material);
                scene.add(model);
            }
            
            animate();
        }
        
        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        
        function resetCamera() {
            camera.position.set(0, 0, 5);
            controls.reset();
        }
        
        function toggleWireframe() {
            if (model) {
                model.material.wireframe = !model.material.wireframe;
            }
        }
        
        function exportModel() {
            const link = document.createElement('a');
            link.download = '${title.replace(/\\s+/g, '_')}.png';
            link.href = renderer.domElement.toDataURL();
            link.click();
        }
        
        init();
    </script>
</body>
</html>`;
  }

  // Generate colors for charts
  generateColors(count, alpha = 1) {
    const colors = [];
    const baseColors = [
      `rgba(54, 162, 235, ${alpha})`,
      `rgba(255, 99, 132, ${alpha})`,
      `rgba(255, 206, 86, ${alpha})`,
      `rgba(75, 192, 192, ${alpha})`,
      `rgba(153, 102, 255, ${alpha})`,
      `rgba(255, 159, 64, ${alpha})`,
      `rgba(199, 199, 199, ${alpha})`,
      `rgba(83, 102, 255, ${alpha})`,
      `rgba(255, 99, 255, ${alpha})`,
      `rgba(99, 255, 132, ${alpha})`
    ];

    for (let i = 0; i < count; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }

    return colors;
  }

  // Prepare heatmap data
  prepareHeatmapData(data, options) {
    // Implementation for heatmap data preparation
    return {
      data: data,
      xLabels: data.map((_, i) => `X${i}`),
      yLabels: data.map((_, i) => `Y${i}`)
    };
  }

  // Prepare treemap data
  prepareTreemapData(data, options) {
    // Implementation for treemap data preparation
    return {
      name: 'root',
      children: data.map(item => ({
        name: item.name || 'Item',
        value: item.value || 1
      }))
    };
  }

  // Prepare network data
  prepareNetworkData(data, options) {
    // Implementation for network data preparation
    return {
      nodes: data.nodes || [],
      edges: data.edges || []
    };
  }

  // List generated visualizations
  async listVisualizations(type = null) {
    try {
      const types = type ? [type] : ['charts', 'diagrams', 'architectures', 'models'];
      const results = {};

      for (const t of types) {
        const dir = path.join(this.outputDir, t);
        try {
          const files = await fs.readdir(dir);
          results[t] = files.map(file => ({
            filename: file,
            type: t.slice(0, -1), // Remove 's' from plural
            path: path.join(dir, file)
          }));
        } catch (error) {
          results[t] = [];
        }
      }

      return {
        success: true,
        data: results,
        total: Object.values(results).reduce((sum, arr) => sum + arr.length, 0)
      };
    } catch (error) {
      console.error('❌ Failed to list visualizations:', error);
      throw error;
    }
  }

  // Delete visualization
  async deleteVisualization(filename, type) {
    try {
      const filepath = path.join(this.outputDir, `${type}s`, filename);
      await fs.unlink(filepath);
      
      return {
        success: true,
        message: `Visualization ${filename} deleted successfully`
      };
    } catch (error) {
      console.error('❌ Failed to delete visualization:', error);
      throw error;
    }
  }

  // Get visualization statistics
  async getStatistics() {
    try {
      const list = await this.listVisualizations();
      const stats = {
        total: 0,
        byType: {},
        storageUsage: 0
      };

      for (const [type, files] of Object.entries(list.data)) {
        stats.byType[type] = files.length;
        stats.total += files.length;
      }

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('❌ Failed to get statistics:', error);
      throw error;
    }
  }
}

module.exports = VisualizationAgent;
