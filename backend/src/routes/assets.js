import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';

const assets = new Hono();

// Get user's asset count and plan limits
assets.get('/limits', async (c) => {
  const { DB } = c.env;
  const userId = c.get('userId');

  try {
    const profile = await DB.prepare(
      'SELECT plan_type, asset_count FROM profiles WHERE id = ?'
    ).bind(userId).first();

    if (!profile) {
      return c.json({
        error: true,
        message: 'User profile not found'
      }, 404);
    }

    // Plan limits
    const limits = {
      starter: 3,
      growth: 50,
      scale: 999999
    };

    return c.json({
      error: false,
      data: {
        plan_type: profile.plan_type,
        current_assets: profile.asset_count || 0,
        max_assets: limits[profile.plan_type] || 3,
        can_add_more: (profile.asset_count || 0) < (limits[profile.plan_type] || 3),
        remaining_slots: (limits[profile.plan_type] || 3) - (profile.asset_count || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching limits:', error);
    return c.json({
      error: true,
      message: 'Failed to fetch user limits'
    }, 500);
  }
});

// Get all assets for the authenticated user
assets.get('/', async (c) => {
  const { DB } = c.env;
  const userId = c.get('userId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = (page - 1) * limit;

  try {
    const assets = await DB.prepare(
      `SELECT a.*, t.name as template_name, t.category
       FROM assets a
       LEFT JOIN equipment_templates t ON a.template_id = t.id
       WHERE a.user_id = ?
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(userId, limit, offset).all();

    const totalCount = await DB.prepare(
      'SELECT COUNT(*) as count FROM assets WHERE user_id = ?'
    ).bind(userId).first();

    return c.json({
      error: false,
      data: assets.results,
      pagination: {
        page,
        limit,
        total: totalCount.count,
        has_more: offset + assets.results.length < totalCount.count
      }
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    return c.json({
      error: true,
      message: 'Failed to fetch assets'
    }, 500);
  }
});

// Get a single asset
assets.get('/:id', async (c) => {
  const { DB } = c.env;
  const userId = c.get('userId');
  const assetId = c.req.param('id');

  try {
    const asset = await DB.prepare(
      `SELECT a.*, t.name as template_name, t.category
       FROM assets a
       LEFT JOIN equipment_templates t ON a.template_id = t.id
       WHERE a.id = ? AND a.user_id = ?`
    ).bind(assetId, userId).first();

    if (!asset) {
      return c.json({
        error: true,
        message: 'Asset not found or access denied'
      }, 404);
    }

    return c.json({
      error: false,
      data: asset
    });
  } catch (error) {
    console.error('Error fetching asset:', error);
    return c.json({
      error: true,
      message: 'Failed to fetch asset'
    }, 500);
  }
});

// Create a new asset
assets.post('/', async (c) => {
  const { DB } = c.env;
  const userId = c.get('userId');
  const { name, model, serial_number, location, status, health_score, template_id } = await c.req.json();

  if (!name) {
    return c.json({
      error: true,
      message: 'Asset name is required'
    }, 400);
  }

  try {
    // Check plan limits
    const profile = await DB.prepare(
      'SELECT plan_type, asset_count FROM profiles WHERE id = ?'
    ).bind(userId).first();

    const limits = {
      starter: 3,
      growth: 50,
      scale: 999999
    };

    const currentCount = profile?.asset_count || 0;
    const maxAssets = limits[profile?.plan_type || 'starter'];

    if (currentCount >= maxAssets) {
      return c.json({
        error: true,
        message: `Asset limit reached. Your plan allows ${maxAssets} assets.`,
        code: 'ASSET_LIMIT_EXCEEDED',
        current_count: currentCount,
        max_allowed: maxAssets,
        upgrade_required: profile?.plan_type === 'starter'
      }, 403);
    }

    // Create asset
    const assetId = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    await DB.prepare(
      `INSERT INTO assets (
        id, user_id, name, model, serial_number, location,
        status, health_score, template_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      assetId,
      userId,
      name,
      model || null,
      serial_number || null,
      location || null,
      status || 'Running',
      health_score || 100,
      template_id || null,
      now,
      now
    ).run();

    // Update asset count
    await DB.prepare(
      'UPDATE profiles SET asset_count = asset_count + 1, updated_at = ? WHERE id = ?'
    ).bind(now, userId).run();

    // Fetch created asset
    const asset = await DB.prepare(
      `SELECT a.*, t.name as template_name, t.category
       FROM assets a
       LEFT JOIN equipment_templates t ON a.template_id = t.id
       WHERE a.id = ?`
    ).bind(assetId).first();

    return c.json({
      error: false,
      data: asset
    }, 201);
  } catch (error) {
    console.error('Error creating asset:', error);
    return c.json({
      error: true,
      message: 'Failed to create asset'
    }, 500);
  }
});

// Update an asset
assets.put('/:id', async (c) => {
  const { DB } = c.env;
  const userId = c.get('userId');
  const assetId = c.req.param('id');
  const { name, model, serial_number, location, status, health_score } = await c.req.json();

  try {
    // Check if asset exists and belongs to user
    const existingAsset = await DB.prepare(
      'SELECT id FROM assets WHERE id = ? AND user_id = ?'
    ).bind(assetId, userId).first();

    if (!existingAsset) {
      return c.json({
        error: true,
        message: 'Asset not found or access denied'
      }, 404);
    }

    // Update asset
    await DB.prepare(
      `UPDATE assets
       SET name = ?, model = ?, serial_number = ?, location = ?,
           status = ?, health_score = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`
    ).bind(
      name,
      model || null,
      serial_number || null,
      location || null,
      status || 'Running',
      health_score || 100,
      Math.floor(Date.now() / 1000),
      assetId,
      userId
    ).run();

    // Fetch updated asset
    const asset = await DB.prepare(
      `SELECT a.*, t.name as template_name, t.category
       FROM assets a
       LEFT JOIN equipment_templates t ON a.template_id = t.id
       WHERE a.id = ?`
    ).bind(assetId).first();

    return c.json({
      error: false,
      data: asset
    });
  } catch (error) {
    console.error('Error updating asset:', error);
    return c.json({
      error: true,
      message: 'Failed to update asset'
    }, 500);
  }
});

// Delete an asset
assets.delete('/:id', async (c) => {
  const { DB } = c.env;
  const userId = c.get('userId');
  const assetId = c.req.param('id');

  try {
    // Check if asset exists and belongs to user
    const existingAsset = await DB.prepare(
      'SELECT id FROM assets WHERE id = ? AND user_id = ?'
    ).bind(assetId, userId).first();

    if (!existingAsset) {
      return c.json({
        error: true,
        message: 'Asset not found or access denied'
      }, 404);
    }

    // Delete asset (cascade will handle related work orders)
    await DB.prepare(
      'DELETE FROM assets WHERE id = ? AND user_id = ?'
    ).bind(assetId, userId).run();

    // Update asset count
    await DB.prepare(
      'UPDATE profiles SET asset_count = asset_count - 1, updated_at = ? WHERE id = ?'
    ).bind(Math.floor(Date.now() / 1000), userId).run();

    return c.json({
      error: false,
      message: 'Asset deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return c.json({
      error: true,
      message: 'Failed to delete asset'
    }, 500);
  }
});

export { assets as assetRoutes };