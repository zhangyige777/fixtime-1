import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';

const templates = new Hono();

// Get all equipment templates (public endpoint, no auth needed)
templates.get('/equipment', async (c) => {
  const { DB } = c.env;

  try {
    const equipmentTemplates = await DB.prepare(
      'SELECT * FROM equipment_templates ORDER BY name ASC'
    ).all();

    return c.json({
      error: false,
      data: equipmentTemplates.results
    });
  } catch (error) {
    console.error('Error fetching equipment templates:', error);
    return c.json({
      error: true,
      message: 'Failed to fetch equipment templates'
    }, 500);
  }
});

// Get checklists for a specific template
templates.get('/checklists/:templateId', async (c) => {
  const { DB } = c.env;
  const templateId = c.req.param('templateId');

  try {
    const checklists = await DB.prepare(
      `SELECT * FROM template_checklists
       WHERE template_id = ? AND is_active = 1
       ORDER BY priority DESC, frequency_days ASC, order_index ASC`
    ).bind(templateId).all();

    return c.json({
      error: false,
      data: checklists.results
    });
  } catch (error) {
    console.error('Error fetching checklists:', error);
    return c.json({
      error: true,
      message: 'Failed to fetch checklists'
    }, 500);
  }
});

// Generate maintenance schedule based on template
templates.post('/generate-schedule', async (c) => {
  const { DB } = c.env;
  const userId = c.get('userId');
  const { template_id, asset_name, frequency_multiplier = 1 } = await c.req.json();

  if (!template_id || !asset_name) {
    return c.json({
      error: true,
      message: 'template_id and asset_name are required'
    }, 400);
  }

  try {
    // Get template details
    const template = await DB.prepare(
      'SELECT * FROM equipment_templates WHERE id = ?'
    ).bind(template_id).first();

    if (!template) {
      return c.json({
        error: true,
        message: 'Template not found'
      }, 404);
    }

    // Get all checklists for this template
    const checklists = await DB.prepare(
      'SELECT * FROM template_checklists WHERE template_id = ? AND is_active = 1 ORDER BY order_index'
    ).bind(template_id).all();

    const now = Math.floor(Date.now() / 1000);
    const oneDay = 24 * 60 * 60;

    // Generate upcoming maintenance schedule for next 90 days
    const schedule = [];
    for (const checklist of checklists.results) {
      const frequencySeconds = checklist.frequency_days * oneDay;
      const adjustedFrequency = Math.round(frequencySeconds / frequency_multiplier);

      // Calculate next 1-3 due dates within 90 days
      for (let i = 0; i < 3; i++) {
        const nextDue = now + (adjustedFrequency * (i + 1));
        if (nextDue - now <= 90 * oneDay) {
          schedule.push({
            task_name: checklist.title,
            task_description: checklist.task_text,
            frequency_days: checklist.frequency_days,
            priority: checklist.priority,
            estimated_duration: checklist.estimated_duration,
            due_date: nextDue,
            due_date_readable: new Date(nextDue * 1000).toISOString().split('T')[0],
            days_from_now: Math.round((nextDue - now) / oneDay)
          });
        }
      }
    }

    // Sort by due date
    schedule.sort((a, b) => a.due_date - b.due_date);

    return c.json({
      error: false,
      data: {
        template,
        schedule: schedule.slice(0, 10), // Return next 10 tasks
        total_scheduled: schedule.length
      }
    });
  } catch (error) {
    console.error('Error generating schedule:', error);
    return c.json({
      error: true,
      message: 'Failed to generate maintenance schedule'
    }, 500);
  }
});

// Search equipment templates by category or name
templates.get('/search', async (c) => {
  const { DB } = c.env;
  const query = c.req.query('q');
  const category = c.req.query('category');

  try {
    let sql = 'SELECT * FROM equipment_templates WHERE 1=1';
    const params = [];

    if (query) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${query}%`, `%${query}%`);
    }

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY name ASC';

    const templates = await DB.prepare(sql).bind(...params).all();

    return c.json({
      error: false,
      data: templates.results
    });
  } catch (error) {
    console.error('Error searching templates:', error);
    return c.json({
      error: true,
      message: 'Failed to search templates'
    }, 500);
  }
});

// Get all categories
templates.get('/categories', async (c) => {
  const { DB } = c.env;

  try {
    const categories = await DB.prepare(
      'SELECT DISTINCT category FROM equipment_templates ORDER BY category ASC'
    ).all();

    return c.json({
      error: false,
      data: categories.results.map(c => c.category)
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return c.json({
      error: true,
      message: 'Failed to fetch categories'
    }, 500);
  }
});

export { templates as templateRoutes };