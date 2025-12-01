import { Hono } from 'hono';

const users = new Hono();

// Get user profile with asset and work order stats
users.get('/dashboard', async (c) => {
  const { DB } = c.env;
  const userId = c.get('userId');

  try {
    // Get user profile
    const profile = await DB.prepare(
      'SELECT * FROM profiles WHERE id = ?'
    ).bind(userId).first();

    if (!profile) {
      return c.json({
        error: true,
        message: 'User profile not found'
      }, 404);
    }

    // Get asset counts by status
    const assetStats = await DB.prepare(
      `SELECT
         status,
         COUNT(*) as count
       FROM assets
       WHERE user_id = ?
       GROUP BY status`
    ).bind(userId).all();

    // Get work order counts
    const workOrderStats = await DB.prepare(
      `SELECT
         status,
         COUNT(*) as count
       FROM work_orders
       WHERE user_id = ?
       GROUP BY status`
    ).bind(userId).all();

    // Get recent work orders
    const recentWorkOrders = await DB.prepare(
      `SELECT wo.*, a.name as asset_name
       FROM work_orders wo
       LEFT JOIN assets a ON wo.asset_id = a.id
       WHERE wo.user_id = ?
       ORDER BY wo.created_at DESC
       LIMIT 5`
    ).bind(userId).all();

    // Calculate asset health
    const healthResult = await DB.prepare(
      'SELECT AVG(health_score) as avg_health FROM assets WHERE user_id = ?'
    ).bind(userId).first();

    // Get upcoming maintenance (next 7 days)
    const now = Math.floor(Date.now() / 1000);
    const sevenDaysFromNow = now + (7 * 24 * 60 * 60);
    const upcomingMaintenance = await DB.prepare(
      `SELECT a.name, a.next_maintenance_date
       FROM assets a
       WHERE a.user_id = ?
         AND a.next_maintenance_date IS NOT NULL
         AND a.next_maintenance_date BETWEEN ? AND ?
       ORDER BY a.next_maintenance_date ASC
       LIMIT 5`
    ).bind(userId, now, sevenDaysFromNow).all();

    // Format response
    const dashboard = {
      user: profile,
      stats: {
        total_assets: assetStats.results.reduce((sum, item) => sum + item.count, 0),
        assets_by_status: assetStats.results,
        total_work_orders: workOrderStats.results.reduce((sum, item) => sum + item.count, 0),
        work_orders_by_status: workOrderStats.results,
        avg_asset_health: Math.round(healthResult.avg_health || 0),
        upcoming_maintenance_count: upcomingMaintenance.results.length
      },
      recent_work_orders: recentWorkOrders.results,
      upcoming_maintenance: upcomingMaintenance.results
    };

    return c.json({
      error: false,
      data: dashboard
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return c.json({
      error: true,
      message: 'Failed to fetch dashboard data'
    }, 500);
  }
});

// Update user plan (for upgrade simulation)
users.post('/upgrade-plan', async (c) => {
  const { DB } = c.env;
  const userId = c.get('userId');
  const { plan_type } = await c.req.json();

  if (!plan_type || !['starter', 'growth', 'scale'].includes(plan_type)) {
    return c.json({
      error: true,
      message: 'Invalid plan type'
    }, 400);
  }

  try {
    await DB.prepare(
      `UPDATE profiles
       SET plan_type = ?, updated_at = ?
       WHERE id = ?`
    ).bind(
      plan_type,
      Math.floor(Date.now() / 1000),
      userId
    ).run();

    const updatedProfile = await DB.prepare(
      'SELECT * FROM profiles WHERE id = ?'
    ).bind(userId).first();

    return c.json({
      error: false,
      data: updatedProfile,
      message: `Successfully upgraded to ${plan_type} plan`
    });
  } catch (error) {
    console.error('Error upgrading plan:', error);
    return c.json({
      error: true,
      message: 'Failed to upgrade plan'
    }, 500);
  }
});

export { users as userRoutes };