import {
  DeepAnalyzedFile,
  ArchitecturePattern,
  ArchitectureEvidence,
  ArchitectureComponent
} from '../../../shared/types/analysis';

export class ArchitectureDetector {
  private files: DeepAnalyzedFile[] = [];

  public detectPatterns(files: DeepAnalyzedFile[]): ArchitecturePattern[] {
    this.files = files;
    const patterns: ArchitecturePattern[] = [];

    // Detect various architecture patterns
    patterns.push(...this.detectMVC());
    patterns.push(...this.detectMVVM());
    patterns.push(...this.detectComponent());
    patterns.push(...this.detectLayered());
    patterns.push(...this.detectMicroservices());
    patterns.push(...this.detectDesignPatterns());

    // Sort by confidence
    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  private detectMVC(): ArchitecturePattern[] {
    const patterns: ArchitecturePattern[] = [];

    // Look for MVC pattern indicators
    const modelFiles = this.files.filter(file =>
      file.name.toLowerCase().includes('model') ||
      file.path.toLowerCase().includes('/model') ||
      file.classes.some(cls => cls.name.toLowerCase().includes('model'))
    );

    const viewFiles = this.files.filter(file =>
      file.name.toLowerCase().includes('view') ||
      file.path.toLowerCase().includes('/view') ||
      file.name.toLowerCase().includes('component') ||
      file.imports.some(imp => imp.module.toLowerCase().includes('react') || imp.module.toLowerCase().includes('vue'))
    );

    const controllerFiles = this.files.filter(file =>
      file.name.toLowerCase().includes('controller') ||
      file.path.toLowerCase().includes('/controller') ||
      file.classes.some(cls => cls.name.toLowerCase().includes('controller'))
    );

    if (modelFiles.length > 0 && viewFiles.length > 0 && controllerFiles.length > 0) {
      const evidence: ArchitectureEvidence[] = [];

      if (modelFiles.length > 0) {
        evidence.push({
          type: 'naming_convention',
          description: 'Files with "model" naming pattern found',
          files: modelFiles.map(f => f.path),
          confidence: 0.8
        });
      }

      if (viewFiles.length > 0) {
        evidence.push({
          type: 'naming_convention',
          description: 'View/Component files found',
          files: viewFiles.map(f => f.path),
          confidence: 0.7
        });
      }

      if (controllerFiles.length > 0) {
        evidence.push({
          type: 'naming_convention',
          description: 'Controller files found',
          files: controllerFiles.map(f => f.path),
          confidence: 0.8
        });
      }

      // Check for MVC directory structure
      const hasModelDir = this.files.some(file => file.path.includes('/model/'));
      const hasViewDir = this.files.some(file => file.path.includes('/view/') || file.path.includes('/views/'));
      const hasControllerDir = this.files.some(file => file.path.includes('/controller/') || file.path.includes('/controllers/'));

      if (hasModelDir || hasViewDir || hasControllerDir) {
        evidence.push({
          type: 'directory_structure',
          description: 'MVC directory structure detected',
          files: [],
          confidence: 0.9
        });
      }

      const components: ArchitectureComponent[] = [
        {
          name: 'Model Layer',
          role: 'Data management and business logic',
          files: modelFiles.map(f => f.path),
          responsibilities: ['Data persistence', 'Business rules', 'Data validation']
        },
        {
          name: 'View Layer',
          role: 'User interface presentation',
          files: viewFiles.map(f => f.path),
          responsibilities: ['UI rendering', 'User interaction', 'Data display']
        },
        {
          name: 'Controller Layer',
          role: 'Application logic and flow control',
          files: controllerFiles.map(f => f.path),
          responsibilities: ['Request handling', 'Business logic coordination', 'View selection']
        }
      ];

      const confidence = Math.min(
        0.3 + (evidence.length * 0.2),
        evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length
      );

      patterns.push({
        type: 'MVC',
        confidence,
        description: 'Model-View-Controller pattern detected',
        evidence,
        components
      });
    }

    return patterns;
  }

  private detectMVVM(): ArchitecturePattern[] {
    const patterns: ArchitecturePattern[] = [];

    const modelFiles = this.files.filter(file =>
      file.name.toLowerCase().includes('model') ||
      file.path.toLowerCase().includes('/model')
    );

    const viewFiles = this.files.filter(file =>
      file.name.toLowerCase().includes('view') ||
      file.name.toLowerCase().includes('component') ||
      file.imports.some(imp => imp.module.toLowerCase().includes('react') || imp.module.toLowerCase().includes('vue'))
    );

    const viewModelFiles = this.files.filter(file =>
      file.name.toLowerCase().includes('viewmodel') ||
      file.name.toLowerCase().includes('store') ||
      file.name.toLowerCase().includes('state') ||
      file.imports.some(imp => imp.module.toLowerCase().includes('redux') || imp.module.toLowerCase().includes('mobx'))
    );

    if (modelFiles.length > 0 && viewFiles.length > 0 && viewModelFiles.length > 0) {
      const evidence: ArchitectureEvidence[] = [
        {
          type: 'naming_convention',
          description: 'MVVM file naming patterns detected',
          files: [...modelFiles, ...viewFiles, ...viewModelFiles].map(f => f.path),
          confidence: 0.7
        }
      ];

      // Check for state management imports
      const hasStateManagement = this.files.some(file =>
        file.imports.some(imp =>
          imp.module.includes('redux') || imp.module.includes('mobx') || imp.module.includes('vuex')
        )
      );

      if (hasStateManagement) {
        evidence.push({
          type: 'import_pattern',
          description: 'State management libraries detected',
          files: [],
          confidence: 0.8
        });
      }

      const components: ArchitectureComponent[] = [
        {
          name: 'Model',
          role: 'Data and business logic',
          files: modelFiles.map(f => f.path),
          responsibilities: ['Data persistence', 'Business rules']
        },
        {
          name: 'View',
          role: 'User interface',
          files: viewFiles.map(f => f.path),
          responsibilities: ['UI rendering', 'User interaction']
        },
        {
          name: 'ViewModel',
          role: 'View state and logic',
          files: viewModelFiles.map(f => f.path),
          responsibilities: ['State management', 'View logic', 'Data binding']
        }
      ];

      const confidence = evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length;

      patterns.push({
        type: 'MVVM',
        confidence,
        description: 'Model-View-ViewModel pattern detected',
        evidence,
        components
      });
    }

    return patterns;
  }

  private detectComponent(): ArchitecturePattern[] {
    const patterns: ArchitecturePattern[] = [];

    const componentFiles = this.files.filter(file =>
      file.name.toLowerCase().includes('component') ||
      file.path.toLowerCase().includes('/component') ||
      file.imports.some(imp => imp.module.includes('react') || imp.module.includes('vue') || imp.module.includes('@angular'))
    );

    if (componentFiles.length > this.files.length * 0.3) { // At least 30% are components
      const evidence: ArchitectureEvidence[] = [
        {
          type: 'naming_convention',
          description: 'Component-based file structure',
          files: componentFiles.map(f => f.path),
          confidence: 0.8
        }
      ];

      // Check for component hierarchy
      const hasNestedComponents = componentFiles.some(file =>
        file.imports.some(imp => componentFiles.some(cf => cf.name === imp.module))
      );

      if (hasNestedComponents) {
        evidence.push({
          type: 'import_pattern',
          description: 'Component composition detected',
          files: [],
          confidence: 0.7
        });
      }

      const components: ArchitectureComponent[] = [
        {
          name: 'Components',
          role: 'Reusable UI elements',
          files: componentFiles.map(f => f.path),
          responsibilities: ['UI rendering', 'State management', 'Event handling']
        }
      ];

      const confidence = evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length;

      patterns.push({
        type: 'Component',
        confidence,
        description: 'Component-based architecture detected',
        evidence,
        components
      });
    }

    return patterns;
  }

  private detectLayered(): ArchitecturePattern[] {
    const patterns: ArchitecturePattern[] = [];

    // Look for layered architecture indicators
    const layers = [
      { name: 'presentation', keywords: ['view', 'component', 'ui', 'presentation'] },
      { name: 'service', keywords: ['service', 'business', 'logic'] },
      { name: 'data', keywords: ['data', 'repository', 'dao', 'model'] },
      { name: 'infrastructure', keywords: ['config', 'util', 'helper', 'infrastructure'] }
    ];

    const detectedLayers = layers.map(layer => ({
      ...layer,
      files: this.files.filter(file =>
        layer.keywords.some(keyword =>
          file.path.toLowerCase().includes(keyword) ||
          file.name.toLowerCase().includes(keyword)
        )
      )
    })).filter(layer => layer.files.length > 0);

    if (detectedLayers.length >= 3) {
      const evidence: ArchitectureEvidence[] = [
        {
          type: 'directory_structure',
          description: 'Layered directory structure detected',
          files: detectedLayers.flatMap(layer => layer.files.map(f => f.path)),
          confidence: 0.8
        }
      ];

      const components: ArchitectureComponent[] = detectedLayers.map(layer => ({
        name: `${layer.name.charAt(0).toUpperCase() + layer.name.slice(1)} Layer`,
        role: `Handles ${layer.name} concerns`,
        files: layer.files.map(f => f.path),
        responsibilities: [`${layer.name} logic`]
      }));

      const confidence = Math.min(0.9, 0.4 + (detectedLayers.length * 0.15));

      patterns.push({
        type: 'Layered',
        confidence,
        description: 'Layered architecture pattern detected',
        evidence,
        components
      });
    }

    return patterns;
  }

  private detectMicroservices(): ArchitecturePattern[] {
    const patterns: ArchitecturePattern[] = [];

    // Look for microservices indicators
    const hasApiEndpoints = this.files.some(file => file.endpoints && file.endpoints.length > 0);
    const hasServiceFiles = this.files.filter(file =>
      file.name.toLowerCase().includes('service') ||
      file.path.toLowerCase().includes('/service')
    ).length;

    const hasConfigFiles = this.files.some(file =>
      file.name.toLowerCase().includes('config') ||
      file.name.toLowerCase().includes('docker') ||
      file.name.toLowerCase().includes('package.json')
    );

    const hasMiddleware = this.files.some(file =>
      file.name.toLowerCase().includes('middleware') ||
      file.functions.some(fn => fn.name.toLowerCase().includes('middleware'))
    );

    if (hasApiEndpoints && hasServiceFiles > 0 && (hasConfigFiles || hasMiddleware)) {
      const evidence: ArchitectureEvidence[] = [];

      if (hasApiEndpoints) {
        evidence.push({
          type: 'method_pattern',
          description: 'REST API endpoints detected',
          files: this.files.filter(file => file.endpoints && file.endpoints.length > 0).map(f => f.path),
          confidence: 0.8
        });
      }

      if (hasServiceFiles > 0) {
        evidence.push({
          type: 'naming_convention',
          description: 'Service-oriented file structure',
          files: this.files.filter(file => file.name.toLowerCase().includes('service')).map(f => f.path),
          confidence: 0.7
        });
      }

      const components: ArchitectureComponent[] = [
        {
          name: 'API Layer',
          role: 'External interface',
          files: this.files.filter(file => file.endpoints && file.endpoints.length > 0).map(f => f.path),
          responsibilities: ['Request handling', 'Response formatting', 'Authentication']
        },
        {
          name: 'Service Layer',
          role: 'Business logic',
          files: this.files.filter(file => file.name.toLowerCase().includes('service')).map(f => f.path),
          responsibilities: ['Business operations', 'Data processing', 'Integration']
        }
      ];

      const confidence = evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length;

      patterns.push({
        type: 'Microservices',
        confidence,
        description: 'Microservices architecture pattern detected',
        evidence,
        components
      });
    }

    return patterns;
  }

  private detectDesignPatterns(): ArchitecturePattern[] {
    const patterns: ArchitecturePattern[] = [];

    // Detect Singleton pattern
    const singletonFiles = this.files.filter(file =>
      file.classes.some(cls =>
        cls.methods.some(method => method.name.toLowerCase() === 'getinstance') ||
        cls.properties.some(prop => prop.static && prop.name.toLowerCase().includes('instance'))
      )
    );

    if (singletonFiles.length > 0) {
      patterns.push({
        type: 'Singleton',
        confidence: 0.7,
        description: 'Singleton design pattern detected',
        evidence: [{
          type: 'method_pattern',
          description: 'getInstance methods or static instance properties found',
          files: singletonFiles.map(f => f.path),
          confidence: 0.7
        }],
        components: [{
          name: 'Singletons',
          role: 'Single instance classes',
          files: singletonFiles.map(f => f.path),
          responsibilities: ['Ensure single instance', 'Global access point']
        }]
      });
    }

    // Detect Factory pattern
    const factoryFiles = this.files.filter(file =>
      file.functions.some(fn => fn.name.toLowerCase().includes('create') || fn.name.toLowerCase().includes('factory')) ||
      file.classes.some(cls => cls.name.toLowerCase().includes('factory'))
    );

    if (factoryFiles.length > 0) {
      patterns.push({
        type: 'Factory',
        confidence: 0.6,
        description: 'Factory design pattern detected',
        evidence: [{
          type: 'naming_convention',
          description: 'Factory naming patterns found',
          files: factoryFiles.map(f => f.path),
          confidence: 0.6
        }],
        components: [{
          name: 'Factories',
          role: 'Object creation',
          files: factoryFiles.map(f => f.path),
          responsibilities: ['Object instantiation', 'Creation logic encapsulation']
        }]
      });
    }

    // Detect Observer pattern
    const observerFiles = this.files.filter(file =>
      file.functions.some(fn =>
        fn.name.toLowerCase().includes('observe') ||
        fn.name.toLowerCase().includes('subscribe') ||
        fn.name.toLowerCase().includes('notify') ||
        fn.name.toLowerCase().includes('emit')
      ) ||
      file.classes.some(cls =>
        cls.methods.some(method =>
          method.name.toLowerCase().includes('addeventlistener') ||
          method.name.toLowerCase().includes('subscribe') ||
          method.name.toLowerCase().includes('notify')
        )
      )
    );

    if (observerFiles.length > 0) {
      patterns.push({
        type: 'Observer',
        confidence: 0.6,
        description: 'Observer design pattern detected',
        evidence: [{
          type: 'method_pattern',
          description: 'Observer/subscriber methods found',
          files: observerFiles.map(f => f.path),
          confidence: 0.6
        }],
        components: [{
          name: 'Observers',
          role: 'Event handling and notification',
          files: observerFiles.map(f => f.path),
          responsibilities: ['Event subscription', 'State change notification', 'Loose coupling']
        }]
      });
    }

    // Detect Strategy pattern
    const strategyFiles = this.files.filter(file =>
      file.classes.some(cls => cls.name.toLowerCase().includes('strategy')) ||
      file.functions.some(fn => fn.name.toLowerCase().includes('strategy'))
    );

    if (strategyFiles.length > 0) {
      patterns.push({
        type: 'Strategy',
        confidence: 0.5,
        description: 'Strategy design pattern detected',
        evidence: [{
          type: 'naming_convention',
          description: 'Strategy naming patterns found',
          files: strategyFiles.map(f => f.path),
          confidence: 0.5
        }],
        components: [{
          name: 'Strategies',
          role: 'Algorithm encapsulation',
          files: strategyFiles.map(f => f.path),
          responsibilities: ['Algorithm implementation', 'Interchangeable behavior']
        }]
      });
    }

    return patterns;
  }

  public analyzeComponentHierarchy(files: DeepAnalyzedFile[]): ArchitectureComponent[] {
    const components: ArchitectureComponent[] = [];

    // Group files by their likely architectural role
    const groupings = {
      'Data Layer': files.filter(file =>
        file.name.toLowerCase().includes('model') ||
        file.name.toLowerCase().includes('repository') ||
        file.name.toLowerCase().includes('dao') ||
        file.path.toLowerCase().includes('/data/') ||
        file.path.toLowerCase().includes('/models/')
      ),
      'Service Layer': files.filter(file =>
        file.name.toLowerCase().includes('service') ||
        file.name.toLowerCase().includes('manager') ||
        file.path.toLowerCase().includes('/service/') ||
        file.path.toLowerCase().includes('/business/')
      ),
      'Controller Layer': files.filter(file =>
        file.name.toLowerCase().includes('controller') ||
        file.name.toLowerCase().includes('handler') ||
        file.path.toLowerCase().includes('/controller/') ||
        (file.endpoints && file.endpoints.length > 0)
      ),
      'View Layer': files.filter(file =>
        file.name.toLowerCase().includes('component') ||
        file.name.toLowerCase().includes('view') ||
        file.path.toLowerCase().includes('/view/') ||
        file.path.toLowerCase().includes('/component/') ||
        file.imports.some(imp => imp.module.includes('react') || imp.module.includes('vue'))
      ),
      'Utility Layer': files.filter(file =>
        file.name.toLowerCase().includes('util') ||
        file.name.toLowerCase().includes('helper') ||
        file.name.toLowerCase().includes('config') ||
        file.path.toLowerCase().includes('/util/') ||
        file.path.toLowerCase().includes('/helper/')
      )
    };

    Object.entries(groupings).forEach(([name, files]) => {
      if (files.length > 0) {
        components.push({
          name,
          role: this.getRoleDescription(name),
          files: files.map(f => f.path),
          responsibilities: this.getResponsibilities(name)
        });
      }
    });

    return components;
  }

  private getRoleDescription(layerName: string): string {
    const descriptions: Record<string, string> = {
      'Data Layer': 'Data persistence and management',
      'Service Layer': 'Business logic and operations',
      'Controller Layer': 'Request handling and flow control',
      'View Layer': 'User interface and presentation',
      'Utility Layer': 'Common utilities and configuration'
    };

    return descriptions[layerName] || 'Application component';
  }

  private getResponsibilities(layerName: string): string[] {
    const responsibilities: Record<string, string[]> = {
      'Data Layer': ['Data persistence', 'Database operations', 'Data validation', 'Entity management'],
      'Service Layer': ['Business logic', 'Data processing', 'Integration', 'Workflow management'],
      'Controller Layer': ['Request routing', 'Input validation', 'Response formatting', 'Error handling'],
      'View Layer': ['UI rendering', 'User interaction', 'State management', 'Event handling'],
      'Utility Layer': ['Common functions', 'Configuration', 'Logging', 'Helper methods']
    };

    return responsibilities[layerName] || ['General functionality'];
  }
}