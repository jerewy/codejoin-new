#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const { SUPPORTED_LANGUAGES } = require('../src/config/languages');

const execAsync = promisify(exec);

class ImageBuilder {
  constructor() {
    this.images = this.getRequiredImages();
  }

  getRequiredImages() {
    const images = new Set();

    Object.values(SUPPORTED_LANGUAGES).forEach(lang => {
      images.add(lang.image);
    });

    return Array.from(images);
  }

  async pullImage(image) {
    console.log(`📦 Pulling ${image}...`);

    try {
      const { stdout, stderr } = await execAsync(`docker pull ${image}`);
      console.log(`✅ Successfully pulled ${image}`);

      if (stderr) {
        console.log(`   Info: ${stderr.trim()}`);
      }

      return true;
    } catch (error) {
      console.error(`❌ Failed to pull ${image}: ${error.message}`);
      return false;
    }
  }

  async buildCustomImages() {
    console.log('🔨 Building custom multi-language image...');

    try {
      const { stdout, stderr } = await execAsync(
        'docker build -t code-exec-multi:latest -f docker/Dockerfile.multi-lang .'
      );

      console.log('✅ Successfully built code-exec-multi:latest');

      if (stderr) {
        console.log(`   Build info: ${stderr.trim()}`);
      }

      return true;
    } catch (error) {
      console.error(`❌ Failed to build custom image: ${error.message}`);
      return false;
    }
  }

  async checkDockerInstallation() {
    try {
      await execAsync('docker --version');
      console.log('✅ Docker is installed and accessible');
      return true;
    } catch (error) {
      console.error('❌ Docker is not installed or not accessible');
      console.error('Please install Docker and make sure it is running');
      return false;
    }
  }

  async pullAllImages() {
    console.log(`🚀 Starting to pull ${this.images.length} Docker images...\n`);

    const results = await Promise.allSettled(
      this.images.map(image => this.pullImage(image))
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.length - successful;

    console.log(`\n📊 Results:`);
    console.log(`   ✅ Successfully pulled: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);

    if (failed > 0) {
      console.log('\n⚠️  Some images failed to pull. The system will still work but those languages may not be available.');
    }

    return failed === 0;
  }

  async buildAll() {
    console.log('🐳 Code Execution Backend - Docker Image Builder\n');

    // Check Docker installation
    if (!(await this.checkDockerInstallation())) {
      process.exit(1);
    }

    // Pull all required images
    const pullSuccess = await this.pullAllImages();

    // Build custom images
    const buildSuccess = await this.buildCustomImages();

    console.log('\n🎉 Image building process completed!');

    if (pullSuccess && buildSuccess) {
      console.log('✅ All images are ready for use');
      process.exit(0);
    } else {
      console.log('⚠️  Some issues occurred, but the system should still work');
      process.exit(1);
    }
  }

  async listImages() {
    console.log('📋 Required Docker Images:\n');

    const languagesByImage = {};

    Object.entries(SUPPORTED_LANGUAGES).forEach(([key, config]) => {
      if (!languagesByImage[config.image]) {
        languagesByImage[config.image] = [];
      }
      languagesByImage[config.image].push(config.name);
    });

    Object.entries(languagesByImage).forEach(([image, languages]) => {
      console.log(`   ${image}`);
      console.log(`   └── Languages: ${languages.join(', ')}\n`);
    });
  }
}

// CLI handling
const command = process.argv[2];
const builder = new ImageBuilder();

switch (command) {
  case 'pull':
    builder.pullAllImages();
    break;
  case 'build':
    builder.buildCustomImages();
    break;
  case 'list':
    builder.listImages();
    break;
  case 'all':
  default:
    builder.buildAll();
    break;
}

module.exports = ImageBuilder;