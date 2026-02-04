const TableDataAgent = require('./tableDataAgent');

class ColumnAgent {
  constructor() {
    this.tableAgent = new TableDataAgent();
    this.cache = new Map();
  }

  // Analyze specific column in table data
  async analyzeColumn(data, columnName, analysisType = 'comprehensive') {
    try {
      const columnData = this.extractColumnData(data, columnName);
      const analysis = {
        columnName: columnName,
        analysisType: analysisType,
        timestamp: new Date().toISOString(),
        metadata: this.getColumnMetadata(columnData),
        results: {}
      };

      switch (analysisType) {
        case 'comprehensive':
          analysis.results.statistics = this.getColumnStatistics(columnData);
          analysis.results.distribution = this.getColumnDistribution(columnData);
          analysis.results.patterns = this.detectColumnPatterns(columnData);
          analysis.results.anomalies = this.detectColumnAnomalies(columnData);
          break;
        case 'statistics':
          analysis.results.statistics = this.getColumnStatistics(columnData);
          break;
        case 'distribution':
          analysis.results.distribution = this.getColumnDistribution(columnData);
          break;
        case 'patterns':
          analysis.results.patterns = this.detectColumnPatterns(columnData);
          break;
        case 'anomalies':
          analysis.results.anomalies = this.detectColumnAnomalies(columnData);
          break;
        default:
          throw new Error(`Unknown analysis type: ${analysisType}`);
      }

      return analysis;
    } catch (error) {
      console.error(`❌ Failed to analyze column ${columnName}:`, error);
      throw error;
    }
  }

  // Extract column data from table
  extractColumnData(data, columnName) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid table data');
    }

    const columnData = data
      .map(row => row[columnName])
      .filter(value => value !== null && value !== undefined);

    return columnData;
  }

  // Get column metadata
  getColumnMetadata(columnData) {
    if (!Array.isArray(columnData) || columnData.length === 0) {
      return {
        type: 'empty',
        count: 0,
        uniqueCount: 0,
        nullCount: 0
      };
    }

    const dataType = this.detectDataType(columnData);
    const uniqueValues = new Set(columnData);
    const nullCount = columnData.filter(val => val === null || val === undefined).length;

    return {
      type: dataType,
      count: columnData.length,
      uniqueCount: uniqueValues.size,
      nullCount: nullCount,
      sampleValues: columnData.slice(0, 10),
      hasNulls: nullCount > 0,
      completeness: ((columnData.length - nullCount) / columnData.length * 100).toFixed(2) + '%'
    };
  }

  // Detect data type of column
  detectDataType(values) {
    if (values.length === 0) return 'empty';
    
    const types = values.map(v => typeof v);
    const uniqueTypes = [...new Set(types)];
    
    if (uniqueTypes.length === 1) {
      return uniqueTypes[0];
    }
    
    // Check if all are numbers
    if (types.every(t => t === 'number')) {
      return 'number';
    }
    
    // Check if all are dates
    if (types.every(t => t === 'object' && values[0] instanceof Date)) {
      return 'date';
    }
    
    // Check if all are booleans
    if (types.every(t => t === 'boolean')) {
      return 'boolean';
    }
    
    // Check if all are strings
    if (types.every(t => t === 'string')) {
      return 'string';
    }
    
    return 'mixed';
  }

  // Get column statistics
  getColumnStatistics(columnData) {
    const metadata = this.getColumnMetadata(columnData);
    
    if (metadata.type !== 'number' || columnData.length === 0) {
      return {
        type: metadata.type,
        message: 'Statistical analysis only available for numeric columns'
      };
    }

    const numbers = columnData.map(v => Number(v));
    
    return {
      count: numbers.length,
      sum: numbers.reduce((a, b) => a + b, 0),
      mean: numbers.reduce((a, b) => a + b, 0) / numbers.length,
      median: this.calculateMedian(numbers),
      mode: this.calculateMode(numbers),
      min: Math.min(...numbers),
      max: Math.max(...numbers),
      range: Math.max(...numbers) - Math.min(...numbers),
      variance: this.calculateVariance(numbers),
      standardDeviation: this.calculateStandardDeviation(numbers),
      skewness: this.calculateSkewness(numbers),
      kurtosis: this.calculateKurtosis(numbers),
      quartiles: this.calculateQuartiles(numbers),
      percentiles: this.calculatePercentiles(numbers)
    };
  }

  // Get column distribution
  getColumnDistribution(columnData) {
    const metadata = this.getColumnMetadata(columnData);
    
    if (columnData.length === 0) {
      return { type: 'empty', message: 'No data to analyze' };
    }

    const distribution = {
      type: metadata.type,
      histogram: this.createHistogram(columnData),
      frequency: this.getFrequencyDistribution(columnData),
      cumulative: this.getCumulativeDistribution(columnData)
    };

    // Add distribution-specific metrics for numeric data
    if (metadata.type === 'number') {
      distribution.normality = this.testNormality(columnData);
      distribution.percentiles = this.calculatePercentiles(columnData);
    }

    return distribution;
  }

  // Create histogram
  createHistogram(data, bins = 10) {
    if (data.length === 0) return [];

    const values = data.map(v => Number(v)).filter(v => !isNaN(v));
    if (values.length === 0) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / bins;
    
    const histogram = [];
    for (let i = 0; i < bins; i++) {
      const binMin = min + i * binWidth;
      const binMax = min + (i + 1) * binWidth;
      const count = values.filter(v => v >= binMin && v < binMax).length;
      
      histogram.push({
        bin: i + 1,
        range: `${binMin.toFixed(2)}-${binMax.toFixed(2)}`,
        min: binMin,
        max: binMax,
        count: count,
        frequency: count / values.length
      });
    }

    return histogram;
  }

  // Get frequency distribution
  getFrequencyDistribution(data) {
    const frequency = {};
    
    data.forEach(value => {
      const key = String(value);
      frequency[key] = (frequency[key] || 0) + 1;
    });

    // Convert to array and sort by frequency
    const distribution = Object.entries(frequency)
      .map(([value, count]) => ({
        value,
        count,
        percentage: (count / data.length) * 100
      }))
      .sort((a, b) => b.count - a.count);

    return distribution;
  }

  // Get cumulative distribution
  getCumulativeDistribution(data) {
    const sortedData = [...data].sort((a, b) => a - b);
    const cumulative = [];
    let cumulativeCount = 0;

    sortedData.forEach((value, index) => {
      cumulativeCount++;
      cumulative.push({
        value,
        rank: index + 1,
        cumulativeCount,
        cumulativePercentage: (cumulativeCount / sortedData.length) * 100
      });
    });

    return cumulative;
  }

  // Test for normality using Shapiro-Wilk test approximation
  testNormality(data) {
    if (data.length < 3) return { test: 'insufficient_data', p_value: null };
    
    const numbers = data.map(v => Number(v)).filter(v => !isNaN(v));
    const n = numbers.length;
    
    // Calculate skewness and kurtosis
    const skewness = this.calculateSkewness(numbers);
    const kurtosis = this.calculateKurtosis(numbers);
    
    // Simple normality test based on skewness and kurtosis
    const isNormal = Math.abs(skewness) < 0.5 && Math.abs(kurtosis) < 0.5;
    
    return {
      test: 'normality_approximation',
      isNormal: isNormal,
      skewness: skewness,
      kurtosis: kurtosis,
      sampleSize: n,
      message: isNormal ? 'Data appears normally distributed' : 'Data does not appear normally distributed'
    };
  }

  // Detect patterns in column data
  detectColumnPatterns(columnData) {
    const patterns = [];
    const metadata = this.getColumnMetadata(columnData);

    // Detect sequential patterns
    if (metadata.type === 'number') {
      const sequentialPattern = this.detectSequentialPattern(columnData);
      if (sequentialPattern.detected) {
        patterns.push(sequentialPattern);
      }
    }

    // Detect cyclical patterns
    const cyclicalPattern = this.detectCyclicalPattern(columnData);
    if (cyclicalPattern.detected) {
      patterns.push(cyclicalPattern);
    }

    // Detect categorical patterns
    if (metadata.type === 'string') {
      const categoricalPatterns = this.detectCategoricalPatterns(columnData);
      patterns.push(...categoricalPatterns);
    }

    // Detect temporal patterns
    if (metadata.type === 'date') {
      const temporalPatterns = this.detectTemporalPatterns(columnData);
      patterns.push(...temporalPatterns);
    }

    return patterns;
  }

  // Detect sequential patterns in numeric data
  detectSequentialPattern(data) {
    if (data.length < 3) return { detected: false };

    const differences = [];
    for (let i = 1; i < data.length; i++) {
      differences.push(data[i] - data[i - 1]);
    }

    const uniqueDifferences = [...new Set(differences)];
    const isSequential = uniqueDifferences.length === 1;

    return {
      detected: isSequential,
      pattern: isSequential ? `Sequential with step ${uniqueDifferences[0]}` : 'Non-sequential',
      stepSize: isSequential ? uniqueDifferences[0] : null,
      consistency: isSequential ? 100 : ((data.length - 1) / data.length * 100).toFixed(2) + '%'
    };
  }

  // Detect cyclical patterns
  detectCyclicalPattern(data) {
    // Simplified cyclical pattern detection
    // Would use autocorrelation or FFT for more sophisticated detection
    const period = this.detectPeriod(data);
    
    return {
      detected: period.detected,
      period: period.period,
      strength: period.strength,
      description: period.description
    };
  }

  detectPeriod(data) {
    // Simple period detection using autocorrelation
    if (data.length < 10) return { detected: false };

    const maxPeriod = Math.floor(data.length / 3);
    let bestPeriod = 1;
    let bestCorrelation = 0;

    for (let period = 2; period <= maxPeriod; period++) {
      const correlation = this.calculateAutocorrelation(data, period);
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestPeriod = period;
      }
    }

    return {
      detected: bestCorrelation > 0.3,
      period: bestPeriod,
      strength: bestCorrelation,
      description: bestCorrelation > 0.3 ? `Cyclical pattern with period ${bestPeriod}` : 'No significant cyclical pattern'
    };
  }

  calculateAutocorrelation(data, lag) {
    const n = data.length;
    if (n <= lag) return 0;

    const mean = data.reduce((a, b) => a + b, 0) / n;
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;

    let correlation = 0;
    for (let i = 0; i < n - lag; i++) {
      correlation += (data[i] - mean) * (data[i + lag] - mean);
    }

    return correlation / ((n - lag) * variance);
  }

  // Detect patterns in categorical data
  detectCategoricalPatterns(data) {
    const patterns = [];
    const frequency = this.getFrequencyDistribution(data);

    // Check for zipf distribution
    const zipfPattern = this.testZipfDistribution(frequency);
    if (zipfPattern.isZipf) {
      patterns.push(zipfPattern);
    }

    // Check for pareto distribution
    const paretoPattern = this.testParetoDistribution(frequency);
    if (paretoPattern.isPareto) {
      patterns.push(paretoPattern);
    }

    // Check for uniform distribution
    const uniformPattern = this.testUniformDistribution(frequency);
    if (uniformPattern.isUniform) {
      patterns.push(uniformPattern);
    }

    return patterns;
  }

  testZipfDistribution(frequency) {
    if (frequency.length < 2) return { isZipf: false };

    // Sort by frequency descending
    const sorted = frequency.sort((a, b) => b.count - a.count);
    
    // Calculate expected zipf distribution
    const expectedZipf = sorted.map((item, index) => ({
      rank: index + 1,
      expected: sorted[0].count / (index + 1)
    }));

    // Calculate correlation
    let correlation = 0;
    for (let i = 0; i < sorted.length; i++) {
      correlation += sorted[i].count * expectedZipf[i].expected;
    }

    const n = sorted.length;
    correlation = correlation / Math.sqrt(
      sorted.reduce((sum, item) => sum + item.count * item.count, 0) *
      expectedZipf.reduce((sum, item) => sum + item.expected * item.expected, 0)
    );

    return {
      isZipf: correlation > 0.8,
      correlation: correlation,
      description: correlation > 0.8 ? 'Follows Zipf distribution' : 'Does not follow Zipf distribution'
    };
  }

  testParetoDistribution(frequency) {
    if (frequency.length < 2) return { isPareto: false };

    const sorted = frequency.sort((a, b) => b.count - a.count);
    const total = sorted.reduce((sum, item) => sum + item.count, 0);
    const n = sorted.length;

    // Calculate cumulative percentages
    let cumulative = 0;
    const cumulativePercentages = sorted.map(item => {
      cumulative += item.count;
      return cumulative / total;
    });

    // Check 80/20 rule (Pareto principle)
    const top20Percent = Math.floor(n * 0.2);
    const top20Percentage = cumulativePercentages[top20Percent - 1];

    return {
      isPareto: top20Percentage >= 0.8,
      top20Percentage: top20Percentage,
      description: top20Percentage >= 0.8 ? 'Follows Pareto principle (80/20 rule)' : 'Does not follow Pareto principle'
    };
  }

  testUniformDistribution(frequency) {
    if (frequency.length < 2) return { isUniform: false };

    const counts = frequency.map(item => item.count);
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    const range = maxCount - minCount;

    // Check if all counts are within 10% of the range
    const tolerance = range * 0.1;
    const isUniform = counts.every(count => Math.abs(count - (minCount + maxCount) / 2) <= tolerance);

    return {
      isUniform: isUniform,
      range: range,
      tolerance: tolerance,
      description: isUniform ? 'Appears uniformly distributed' : 'Not uniformly distributed'
    };
  }

  // Detect patterns in temporal data
  detectTemporalPatterns(data) {
    const patterns = [];
    
    // Detect seasonal patterns
    const seasonalPattern = this.detectSeasonalPattern(data);
    if (seasonalPattern.detected) {
      patterns.push(seasonalPattern);
    }

    // Detect trend patterns
    const trendPattern = this.detectTrendPattern(data);
    if (trendPattern.detected) {
      patterns.push(trendPattern);
    }

    // Detect weekly patterns
    const weeklyPattern = this.detectWeeklyPattern(data);
    if (weeklyPattern.detected) {
      patterns.push(weeklyPattern);
    }

    return patterns;
  }

  detectSeasonalPattern(data) {
    // Simplified seasonal pattern detection
    // Would use more sophisticated time series analysis
    const monthlyData = this.aggregateByMonth(data);
    const yearOverYear = this.calculateYearOverYearGrowth(monthlyData);
    
    const hasSeasonality = yearOverYear.some(growth => Math.abs(growth) > 20);
    
    return {
      detected: hasSeasonality,
      pattern: hasSeasonality ? 'Seasonal variation detected' : 'No significant seasonal pattern',
      yearOverYearGrowth: yearOverYear
    };
  }

  aggregateByMonth(data) {
    const monthlyData = {};
    
    data.forEach(date => {
      const month = date.getMonth();
      const year = date.getFullYear();
      const key = `${year}-${month + 1}`;
      
      if (!monthlyData[key]) {
        monthlyData[key] = [];
      }
      monthlyData[key].push(date);
    });

    return monthlyData;
  }

  calculateYearOverYearGrowth(monthlyData) {
    const months = Object.keys(monthlyData).sort();
    const growth = [];
    
    for (let i = 1; i < months.length; i++) {
      const currentMonth = monthlyData[months[i]];
      const previousMonth = monthlyData[months[i - 1]];
      
      if (previousMonth && previousMonth.length > 0) {
        const growth = ((currentMonth.length - previousMonth.length) / previousMonth.length) * 100;
        growth.push(growth);
      }
    }

    return growth;
  }

  detectTrendPattern(data) {
    const sortedData = [...data].sort((a, b) => a - b);
    const firstHalf = sortedData.slice(0, Math.floor(sortedData.length / 2));
    const secondHalf = sortedData.slice(Math.floor(sortedData.length / 2));
    
    const firstHalfMean = firstHalf.length > 0 ? firstHalf.reduce((sum, date) => sum + date.getTime(), 0) / firstHalf.length : 0;
    const secondHalfMean = secondHalf.length > 0 ? secondHalf.reduce((sum, date) => sum + date.getTime(), 0) / secondHalf.length : 0;
    
    const trend = secondHalfMean - firstHalfMean;
    
    return {
      detected: Math.abs(trend) > 86400000, // 1 day in milliseconds
      pattern: trend > 0 ? 'Increasing trend' : trend < 0 ? 'Decreasing trend' : 'No trend',
      magnitude: Math.abs(trend),
      description: Math.abs(trend) > 86400000 ? `Trend detected: ${trend > 0 ? 'increasing' : 'decreasing'}` : 'No significant trend'
    };
  }

  detectWeeklyPattern(data) {
    // Simplified weekly pattern detection
    const weeklyData = this.aggregateByDayOfWeek(data);
    const avgDaily = Object.values(weeklyData).reduce((sum, count) => sum + count, 0) / 7;
    
    const hasWeeklyPattern = Object.values(weeklyData).some(count => 
      Math.abs(count - avgDaily) / avgDaily > 0.3
    );
    
    return {
      detected: hasWeeklyPattern,
      pattern: hasWeeklyPattern ? 'Weekly variation detected' : 'No significant weekly pattern',
      weeklyData: weeklyData
    };
  }

  aggregateByDayOfWeek(data) {
    const weeklyData = {};
    
    data.forEach(date => {
      const dayOfWeek = date.getDay();
      weeklyData[dayOfWeek] = (weeklyData[dayOfWeek] || 0) + 1;
    });

    return weeklyData;
  }

  // Detect anomalies in column data
  detectColumnAnomalies(data) {
    const anomalies = [];
    const metadata = this.getColumnMetadata(data);
    
    if (metadata.type === 'number') {
      const numericAnomalies = this.detectNumericAnomalies(data);
      anomalies.push(...numericAnomalies);
    } else if (metadata.type === 'string') {
      const categoricalAnomalies = this.detectCategoricalAnomalies(data);
      anomalies.push(...categoricalAnomalies);
    } else if (metadata.type === 'date') {
      const temporalAnomalies = this.detectTemporalAnomalies(data);
      anomalies.push(...temporalAnomalies);
    }

    return anomalies;
  }

  detectNumericAnomalies(data) {
    const statistics = this.getColumnStatistics(data);
    const anomalies = [];

    // Detect outliers using IQR method
    const q1 = statistics.quartiles.q1;
    const q3 = statistics.quartiles.q3;
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    data.forEach((value, index) => {
      if (value < lowerBound || value > upperBound) {
        anomalies.push({
          type: 'outlier',
          value: value,
          rowIndex: index,
          method: 'IQR',
          bounds: { lower: lowerBound, upper: upperBound },
          description: `Outlier detected: ${value} (bounds: ${lowerBound}-${upperBound})`
        });
      }
    });

    // Detect zero values
    const zeroCount = data.filter(val => val === 0).length;
    if (zeroCount > data.length * 0.1) {
      anomalies.push({
        type: 'zero_values',
        count: zeroCount,
        percentage: (zeroCount / data.length * 100).toFixed(2) + '%',
        description: `High number of zero values: ${zeroCount} (${(zeroCount / data.length * 100).toFixed(2)}%)`
      });
    }

    return anomalies;
  }

  detectCategoricalAnomalies(data) {
    const frequency = this.getFrequencyDistribution(data);
    const anomalies = [];

    // Detect rare categories (< 1% frequency)
    const rareThreshold = data.length * 0.01;
    frequency.forEach(item => {
      if (item.count < rareThreshold) {
        anomalies.push({
          type: 'rare_category',
          value: item.value,
          count: item.count,
          percentage: item.percentage,
          description: `Rare category: ${item.value} (${item.count} occurrences, ${item.percentage}%)`
        });
      }
    });

    // Detect single occurrence categories
    const singleOccurrences = frequency.filter(item => item.count === 1);
    if (singleOccurrences.length > 0) {
      anomalies.push({
        type: 'single_occurrences',
        count: singleOccurrences.length,
        items: singleOccurrences.map(item => item.value),
        description: `${singleOccurrences.length} categories appear only once`
      });
    }

    return anomalies;
  }

  detectTemporalAnomalies(data) {
    const anomalies = [];
    
    // Detect gaps in time series
    const sortedData = [...data].sort((a, b) => a - b);
    const gaps = [];
    
    for (let i = 1; i < sortedData.length; i++) {
      const timeDiff = sortedData[i].getTime() - sortedData[i - 1].getTime();
      const expectedGap = 24 * 60 * 60 * 1000; // 1 day in milliseconds
      
      if (timeDiff > expectedGap * 7) { // More than a week gap
        gaps.push({
          type: 'time_gap',
          from: sortedData[i - 1],
          to: sortedData[i],
          gapDays: Math.floor(timeDiff / (24 * 60 * 60 * 1000)),
          description: `Time gap: ${Math.floor(timeDiff / (24 * 60 * 60 * 1000)) days`
        });
      }
    }

    anomalies.push(...gaps);

    // Detect duplicate timestamps
    const timestampCounts = {};
    data.forEach(date => {
      const timestamp = date.getTime();
      timestampCounts[timestamp] = (timestampCounts[timestamp] || 0) + 1;
    });

    const duplicates = Object.entries(timestampCounts).filter(([timestamp, count]) => count > 1);
    if (duplicates.length > 0) {
      anomalies.push({
        type: 'duplicate_timestamps',
        count: duplicates.length,
        description: `${duplicates.length} duplicate timestamps found`
      });
    }

    return anomalies;
  }

  // Helper functions
  calculateMedian(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  calculateMode(numbers) {
    const frequency = {};
    numbers.forEach(num => {
      frequency[num] = (frequency[num] || 0) + 1;
    });
    
    let maxCount = 0;
    let mode = null;
    
    Object.entries(frequency).forEach(([value, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mode = Number(value);
      }
    });

    return mode;
  }

  calculateVariance(numbers) {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    return numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
  }

  calculateStandardDeviation(numbers) {
    return Math.sqrt(this.calculateVariance(numbers));
  }

  calculateSkewness(numbers) {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const stdDev = this.calculateStandardDeviation(numbers);
    const n = numbers.length;
    
    const sum = numbers.reduce((acc, num) => acc + Math.pow((num - mean) / stdDev, 3), 0);
    return sum / n;
  }

  calculateKurtosis(numbers) {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const stdDev = this.calculateStandardDeviation(numbers);
    const n = numbers.length;
    
    const sum = numbers.reduce((acc, num) => acc + Math.pow((num - mean) / stdDev, 4), 0);
    return sum / n - 3;
  }

  calculateQuartiles(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const n = sorted.length;
    
    return {
      q1: sorted[Math.floor(n * 0.25)],
      q2: sorted[Math.floor(n * 0.5)],
      q3: sorted[Math.floor(n * 0.75)],
      iqr: sorted[Math.floor(n * 0.75)] - sorted[Math.floor(n * 0.25)]
    };
  }

  calculatePercentiles(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const percentiles = {};
    
    const percentilesToCalculate = [1, 5, 10, 25, 50, 75, 90, 95, 99];
    
    percentilesToCalculate.forEach(p => {
      const index = Math.floor((p / 100) * (sorted.length - 1));
      percentiles[p] = sorted[index];
    });

    return percentiles;
  }
}

module.exports = ColumnAgent;
