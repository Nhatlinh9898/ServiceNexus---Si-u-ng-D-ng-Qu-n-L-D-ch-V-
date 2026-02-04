// Analytics API Routes
// Provides comprehensive analytics data for the dashboard

const express = require('express');
const { Pool } = require('pg');
const { protect, restrictTo } = require('../middleware/auth');
const { performanceOptimizer } = require('../utils/performance');
const { performanceMiddleware } = require('../utils/performance');
const router = express.Router();

// Get dashboard analytics
router.get('/dashboard', protect, performanceMiddleware, async (req, res) => {
  try {
    const { timeRange = 'month' } = req.query;
    const organizationId = req.user.organizationId;
    
    // Calculate date range based on timeRange
    const dateRange = getDateRange(timeRange);
    
    // Get overview metrics
    const overviewQuery = `
      SELECT 
        COUNT(*) as total_services,
        COALESCE(SUM(amount), 0) as total_revenue,
        COUNT(DISTINCT customer_name) as total_customers,
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'COMPLETED') * 100.0 / NULLIF(COUNT(*), 0)), 2
        ) as completion_rate,
        EXTRACT(EPOCH FROM AVG(created_at - updated_at)) as avg_response_time
      FROM services 
      WHERE organization_id = $1 
        AND created_at >= $2
    `;
    
    const overviewResult = await performanceOptimizer.optimizedQuery(overviewQuery, [organizationId, dateRange.startDate]);
    const overview = overviewResult.rows[0];
    
    // Get monthly growth
    const growthQuery = `
      SELECT 
        COUNT(*) as current_month,
        LAG(COUNT(*), 1) OVER (ORDER BY DATE_TRUNC('month', created_at)) as previous_month
      FROM services 
      WHERE organization_id = $1 
        AND created_at >= $3
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) DESC
      LIMIT 2
    `;
    
    const growthResult = await performanceOptimizer.optimizedQuery(growthQuery, [organizationId, dateRange.startDate, dateRange.growthStartDate]);
    const growthData = growthResult.rows;
    
    let monthlyGrowth = 0;
    if (growthData.length >= 2) {
      const current = growthData[0].current_month;
      const previous = growthData[1].previous_month || 1;
      monthlyGrowth = ((current - previous) / previous) * 100;
    }
    
    // Get trends data
    const trendsQuery = `
      SELECT 
        DATE_TRUNC(${getTimeUnit(timeRange)}, created_at) as period,
        COUNT(*) as services,
        COALESCE(SUM(amount), 0) as revenue,
        COUNT(DISTINCT customer_name) as customers
      FROM services 
      WHERE organization_id = $1 
        AND created_at >= $2
      GROUP BY DATE_TRUNC(${getTimeUnit(timeRange)}, created_at)
      ORDER BY period ASC
    `;
    
    const trendsResult = await performanceOptimizer.optimizedQuery(trendsQuery, [organizationId, dateRange.startDate]);
    const trends = {
      daily: formatTrendsData(trendsResult.rows, 'day'),
      weekly: formatTrendsData(trendsResult.rows, 'week'),
      monthly: formatTrendsData(trendsResult.rows, 'month')
    };
    
    // Get industry breakdown
    const industryQuery = `
      SELECT 
        industry_type as industry,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as revenue,
        ROUND(
          (COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM services WHERE organization_id = $1 AND created_at >= $2), 0)), 2
        ) as percentage
      FROM services 
      WHERE organization_id = $1 
        AND created_at >= $2
      GROUP BY industry_type
      ORDER BY count DESC
    `;
    
    const industryResult = await performanceOptimizer.optimizedQuery(industryQuery, [organizationId, dateRange.startDate]);
    
    // Get status breakdown
    const statusQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        ROUND(
          (COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM services WHERE organization_id = $1 AND created_at >= $2), 0)), 2
        ) as percentage
      FROM services 
      WHERE organization_id = $1 
        AND created_at >= $2
      GROUP BY status
      ORDER BY count DESC
    `;
    
    const statusResult = await performanceOptimizer.optimizedQuery(statusQuery, [organizationId, dateRange.startDate]);
    
    // Get performance metrics
    const performanceQuery = `
      SELECT 
        'Response Time' as metric,
        ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))), 2) as value,
        3600 as target,
        CASE 
          WHEN AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) <= 1800 THEN 'good'
          WHEN AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) <= 3600 THEN 'warning'
          ELSE 'critical'
        END as status
      FROM services 
      WHERE organization_id = $1 AND created_at >= $2
      
      UNION ALL
      
      SELECT 
        'Completion Rate' as metric,
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'COMPLETED') * 100.0 / NULLIF(COUNT(*), 0)), 2
        ) as value,
        90 as target,
        CASE 
          WHEN (COUNT(*) FILTER (WHERE status = 'COMPLETED') * 100.0 / NULLIF(COUNT(*), 0)) >= 90 THEN 'good'
          WHEN (COUNT(*) FILTER (WHERE status = 'COMPLETED') * 100.0 / NULLIF(COUNT(*), 0)) >= 75 THEN 'warning'
          ELSE 'critical'
        END as status
      FROM services 
      WHERE organization_id = $1 AND created_at >= $2
      
      UNION ALL
      
      SELECT 
        'Customer Satisfaction' as metric,
        COALESCE(AVG(rating), 0) as value,
        4.5 as target,
        CASE 
          WHEN COALESCE(AVG(rating), 0) >= 4.5 THEN 'good'
          WHEN COALESCE(AVG(rating), 0) >= 3.5 THEN 'warning'
          ELSE 'critical'
        END as status
      FROM services 
      WHERE organization_id = $1 
        AND created_at >= $2 
        AND rating IS NOT NULL
    `;
    
    const performanceResult = await performanceOptimizer.optimizedQuery(performanceQuery, [organizationId, dateRange.startDate]);
    
    // Get top performers
    const performersQuery = `
      SELECT 
        customer_name as name,
        COUNT(*) as services,
        COALESCE(SUM(amount), 0) as revenue,
        COALESCE(AVG(rating), 0) as rating
      FROM services 
      WHERE organization_id = $1 
        AND created_at >= $2
      GROUP BY customer_name
      ORDER BY revenue DESC
      LIMIT 5
    `;
    
    const performersResult = await performanceOptimizer.optimizedQuery(performersQuery, [organizationId, dateRange.startDate]);
    
    // Get customer satisfaction trends
    const satisfactionQuery = `
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COALESCE(AVG(rating), 0) as satisfaction,
        COUNT(rating) as responses
      FROM services 
      WHERE organization_id = $1 
        AND created_at >= $2
        AND rating IS NOT NULL
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `;
    
    const satisfactionResult = await performanceOptimizer.optimizedQuery(satisfactionQuery, [organizationId, dateRange.startDate]);
    
    // Get revenue analysis
    const revenueQuery = `
      SELECT 
        industry_type as source,
        COALESCE(SUM(amount), 0) as amount,
        ROUND(
          (COALESCE(SUM(amount), 0) * 100.0 / NULLIF((SELECT COALESCE(SUM(amount), 0) FROM services WHERE organization_id = $1 AND created_at >= $2), 0)), 2
        ) as percentage,
        CASE 
          WHEN SUM(amount) > LAG(SUM(amount)) OVER (ORDER BY industry_type) THEN 'up'
          WHEN SUM(amount) < LAG(SUM(amount)) OVER (ORDER BY industry_type) THEN 'down'
          ELSE 'stable'
        END as trend
      FROM services 
      WHERE organization_id = $1 
        AND created_at >= $2
      GROUP BY industry_type
      ORDER BY amount DESC
    `;
    
    const revenueResult = await performanceOptimizer.optimizedQuery(revenueQuery, [organizationId, dateRange.startDate]);
    
    const analyticsData = {
      overview: {
        totalServices: parseInt(overview.total_services) || 0,
        totalRevenue: parseFloat(overview.total_revenue) || 0,
        totalCustomers: parseInt(overview.total_customers) || 0,
        completionRate: parseFloat(overview.completion_rate) || 0,
        avgResponseTime: parseFloat(overview.avg_response_time) || 0,
        monthlyGrowth: parseFloat(monthlyGrowth.toFixed(2)) || 0
      },
      trends: trends,
      industryBreakdown: industryResult.rows,
      statusBreakdown: statusResult.rows,
      performanceMetrics: performanceResult.rows,
      topPerformers: performersResult.rows,
      customerSatisfaction: satisfactionResult.rows,
      revenueAnalysis: revenueResult.rows
    };
    
    // Cache the results
    const cacheKey = `analytics:dashboard:${organizationId}:${timeRange}`;
    if (performanceOptimizer.redis) {
      await performanceOptimizer.redis.setex(cacheKey, 300, JSON.stringify(analyticsData));
    }
    
    res.json(analyticsData);
    
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// Get detailed analytics for specific time period
router.get('/detailed', protect, restrictTo('admin', 'manager'), performanceMiddleware, async (req, res) => {
  try {
    const { 
      timeRange = 'month', 
      industry, 
      status, 
      customer,
      startDate,
      endDate 
    } = req.query;
    
    const organizationId = req.user.organizationId;
    
    // Build dynamic query
    let query = `
      SELECT 
        id,
        customer_name,
        title,
        industry_type,
        status,
        amount,
        priority,
        rating,
        created_at,
        updated_at,
        completed_at,
        notes
      FROM services 
      WHERE organization_id = $1
    `;
    
    const params = [organizationId];
    let paramIndex = 2;
    
    // Add date range filter
    if (startDate && endDate) {
      query += ` AND created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(startDate, endDate);
      paramIndex += 2;
    } else {
      const dateRange = getDateRange(timeRange);
      query += ` AND created_at >= $${paramIndex}`;
      params.push(dateRange.startDate);
      paramIndex++;
    }
    
    // Add optional filters
    if (industry) {
      query += ` AND industry_type = $${paramIndex}`;
      params.push(industry);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (customer) {
      query += ` AND customer_name ILIKE $${paramIndex}`;
      params.push(`%${customer}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const result = await performanceOptimizer.optimizedQuery(query, params);
    
    res.json({
      data: result.rows,
      total: result.rows.length,
      filters: { timeRange, industry, status, customer, startDate, endDate }
    });
    
  } catch (error) {
    console.error('Detailed analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch detailed analytics' });
  }
});

// Export analytics data
router.get('/export', protect, restrictTo('admin', 'manager'), performanceMiddleware, async (req, res) => {
  try {
    const { timeRange = 'month', format = 'csv' } = req.query;
    const organizationId = req.user.organizationId;
    
    const dateRange = getDateRange(timeRange);
    
    const query = `
      SELECT 
        customer_name as "Customer Name",
        title as "Service Title",
        industry_type as "Industry Type",
        status as "Status",
        amount as "Amount",
        priority as "Priority",
        rating as "Rating",
        created_at as "Created Date",
        updated_at as "Updated Date",
        completed_at as "Completed Date",
        notes as "Notes"
      FROM services 
      WHERE organization_id = $1 
        AND created_at >= $2
      ORDER BY created_at DESC
    `;
    
    const result = await performanceOptimizer.optimizedQuery(query, [organizationId, dateRange.startDate]);
    
    if (format === 'csv') {
      const csv = convertToCSV(result.rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`);
      res.json(result.rows);
    } else {
      res.status(400).json({ error: 'Unsupported format' });
    }
    
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({ error: 'Failed to export analytics data' });
  }
});

// Get real-time metrics
router.get('/realtime', protect, performanceMiddleware, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    
    // Get real-time metrics
    const metricsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM services WHERE organization_id = $1 AND created_at >= NOW() - INTERVAL '24 hours') as services_today,
        (SELECT COALESCE(SUM(amount), 0) FROM services WHERE organization_id = $1 AND created_at >= NOW() - INTERVAL '24 hours') as revenue_today,
        (SELECT COUNT(*) FROM services WHERE organization_id = $1 AND status = 'PENDING') as pending_services,
        (SELECT COUNT(*) FROM services WHERE organization_id = $1 AND status = 'IN_PROGRESS') as in_progress_services,
        (SELECT COUNT(*) FROM services WHERE organization_id = $1 AND created_at >= NOW() - INTERVAL '1 hour') as services_last_hour,
        (SELECT COUNT(DISTINCT customer_name) FROM services WHERE organization_id = $1 AND created_at >= NOW() - INTERVAL '24 hours') as active_customers_today
    `;
    
    const result = await performanceOptimizer.optimizedQuery(metricsQuery, [organizationId]);
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Real-time metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch real-time metrics' });
  }
});

// Helper functions
function getDateRange(timeRange) {
  const now = new Date();
  let startDate, growthStartDate;
  
  switch (timeRange) {
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      growthStartDate = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      growthStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      growthStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      growthStartDate = new Date(now.getFullYear() - 1, 0, 1);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      growthStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  }
  
  return { startDate, growthStartDate };
}

function getTimeUnit(timeRange) {
  switch (timeRange) {
    case 'day': return 'hour';
    case 'week': return 'day';
    case 'month': return 'day';
    case 'year': return 'month';
    default: return 'day';
  }
}

function formatTrendsData(rows, timeUnit) {
  return rows.map(row => ({
    date: new Date(row.period).toLocaleDateString(),
    services: parseInt(row.services) || 0,
    revenue: parseFloat(row.revenue) || 0,
    customers: parseInt(row.customers) || 0
  }));
}

function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      return typeof value === 'string' && value.includes(',') 
        ? `"${value.replace(/"/g, '""')}"` 
        : value;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}

module.exports = router;
