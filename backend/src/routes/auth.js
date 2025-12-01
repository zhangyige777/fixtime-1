import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';

const auth = new Hono();

// Get current user profile (protected)
auth.get('/profile', authMiddleware, async (c) => {
  const { DB } = c.env;
  const userId = c.get('userId');
  const userEmail = c.get('userEmail');

  try {
    // Check if user profile exists
    const profile = await DB.prepare(
      'SELECT * FROM profiles WHERE id = ?'
    ).bind(userId).first();

    if (!profile) {
      // Create new profile if doesn't exist
      await DB.prepare(
        `INSERT INTO profiles (id, email, company_name, role, plan_type, asset_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        userId,
        userEmail,
        null, // company_name will be updated later
        'admin',
        'starter',
        0,
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000)
      ).run();

      const newProfile = await DB.prepare(
        'SELECT * FROM profiles WHERE id = ?'
      ).bind(userId).first();

      return c.json({
        error: false,
        data: newProfile
      });
    }

    return c.json({
      error: false,
      data: profile
    });
  } catch (error) {
    console.error('Error in auth/profile:', error);
    return c.json({
      error: true,
      message: 'Failed to fetch user profile'
    }, 500);
  }
});

// Update user profile (protected)
auth.put('/profile', authMiddleware, async (c) => {
  const { DB } = c.env;
  const userId = c.get('userId');
  const { company_name } = await c.req.json();

  try {
    await DB.prepare(
      `UPDATE profiles
       SET company_name = ?, updated_at = ?
       WHERE id = ?`
    ).bind(
      company_name || null,
      Math.floor(Date.now() / 1000),
      userId
    ).run();

    const updatedProfile = await DB.prepare(
      'SELECT * FROM profiles WHERE id = ?'
    ).bind(userId).first();

    return c.json({
      error: false,
      data: updatedProfile
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return c.json({
      error: true,
      message: 'Failed to update profile'
    }, 500);
  }
});

export { auth as authRoutes };