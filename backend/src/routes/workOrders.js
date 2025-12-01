import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';

const workOrders = new Hono();

// Get all work orders for the authenticated user
workOrders.get('/', async (c) => {
  const { DB } = c.env;
  const userId = c.get('userId');
  const status = c.req.query('status');
  const asset_id = c.req.query('asset_id');
  const priority = c.req.query('priority');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = (page - 1) * limit;

  try {
    let sql = `
      SELECT wo.*, a.name as asset_name, a.model as asset_model, a.location as asset_location
      FROM work_orders wo
      LEFT JOIN assets a ON wo.asset_id = a.id
      WHERE wo.user_id = ?
    `;
    const params = [userId];

    if (status) {
      sql += ' AND wo.status = ?';
      params.push(status);
    }

    if (asset_id) {
      sql += ' AND wo.asset_id = ?';
      params.push(asset_id);
    }

    if (priority) {
      sql += ' AND wo.priority = ?';
      params.push(priority);
    }

    sql += ' ORDER BY wo.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const workOrders = await DB.prepare(sql).bind(...params).all();

    // Get tasks for each work order
    for (const wo of workOrders.results) {
      const tasks = await DB.prepare(
        'SELECT * FROM work_order_tasks WHERE work_order_id = ? ORDER BY order_index'
      ).bind(wo.id).all();
      wo.tasks = tasks.results;
    }

    const totalCount = await DB.prepare(
      'SELECT COUNT(*) as count FROM work_orders WHERE user_id = ?'
    ).bind(userId).first();

    return c.json({
      error: false,
      data: workOrders.results,
      pagination: {
        page,
        limit,
        total: totalCount.count,
        has_more: offset + workOrders.results.length < totalCount.count
      }
    });
  } catch (error) {
    console.error('Error fetching work orders:', error);
    return c.json({
      error: true,
      message: 'Failed to fetch work orders'
    }, 500);
  }
});

// Get a single work order with tasks
workOrders.get('/:id', async (c) => {
  const { DB } = c.env;
  const userId = c.get('userId');
  const workOrderId = c.req.param('id');

  try {
    const workOrder = await DB.prepare(
      `SELECT wo.*, a.name as asset_name, a.model as asset_model, a.location as asset_location
       FROM work_orders wo
       LEFT JOIN assets a ON wo.asset_id = a.id
       WHERE wo.id = ? AND wo.user_id = ?`
    ).bind(workOrderId, userId).first();

    if (!workOrder) {
      return c.json({
        error: true,
        message: 'Work order not found or access denied'
      }, 404);
    }

    // Get tasks
    const tasks = await DB.prepare(
      'SELECT * FROM work_order_tasks WHERE work_order_id = ? ORDER BY order_index'
    ).bind(workOrderId).all();

    workOrder.tasks = tasks.results;

    return c.json({
      error: false,
      data: workOrder
    });
  } catch (error) {
    console.error('Error fetching work order:', error);
    return c.json({
      error: true,
      message: 'Failed to fetch work order'
    }, 500);
  }
});

// Create a new work order
workOrders.post('/', async (c) => {
  const { DB } = c.env;
  const userId = c.get('userId');
  const {
    title,
    description,
    asset_id,
    priority = 'Normal',
    due_date,
    checklist_template_id,
    tasks
  } = await c.req.json();

  if (!title) {
    return c.json({
      error: true,
      message: 'Work order title is required'
    }, 400);
  }

  try {
    // Verify asset belongs to user if provided
    if (asset_id) {
      const asset = await DB.prepare(
        'SELECT id FROM assets WHERE id = ? AND user_id = ?'
      ).bind(asset_id, userId).first();

      if (!asset) {
        return c.json({
          error: true,
          message: 'Asset not found or access denied'
        }, 404);
      }
    }

    const workOrderId = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    // Create work order
    await DB.prepare(
      `INSERT INTO work_orders (
        id, user_id, asset_id, title, description, priority,
        status, due_date, checklist_template_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      workOrderId,
      userId,
      asset_id || null,
      title,
      description || null,
      priority,
      'Open',
      due_date || null,
      checklist_template_id || null,
      now,
      now
    ).run();

    // Create tasks if provided
    if (tasks && tasks.length > 0) {
      for (let i = 0; i < tasks.length; i++) {
        const taskId = uuidv4();
        await DB.prepare(
          `INSERT INTO work_order_tasks (id, work_order_id, task_text, order_index, created_at)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(
          taskId,
          workOrderId,
          tasks[i].task_text || tasks[i],
          i,
          now
        ).run();
      }
    }

    // Fetch created work order
    const workOrder = await DB.prepare(
      `SELECT wo.*, a.name as asset_name
       FROM work_orders wo
       LEFT JOIN assets a ON wo.asset_id = a.id
       WHERE wo.id = ?`
    ).bind(workOrderId).first();

    return c.json({
      error: false,
      data: workOrder
    }, 201);
  } catch (error) {
    console.error('Error creating work order:', error);
    return c.json({
      error: true,
      message: 'Failed to create work order'
    }, 500);
  }
});

// Update work order status
workOrders.patch('/:id/status', async (c) => {
  const { DB } = c.env;
  const userId = c.get('userId');
  const workOrderId = c.req.param('id');
  const { status } = await c.req.json();

  if (!status) {
    return c.json({
      error: true,
      message: 'Status is required'
    }, 400);
  }

  const validStatuses = ['Open', 'In Progress', 'Completed', 'Cancelled'];
  if (!validStatuses.includes(status)) {
    return c.json({
      error: true,
      message: 'Invalid status'
    }, 400);
  }

  try {
    // Check if work order exists and belongs to user
    const existingWorkOrder = await DB.prepare(
      'SELECT id FROM work_orders WHERE id = ? AND user_id = ?'
    ).bind(workOrderId, userId).first();

    if (!existingWorkOrder) {
      return c.json({
        error: true,
        message: 'Work order not found or access denied'
      }, 404);
    }

    const now = Math.floor(Date.now() / 1000);
    const completedAt = status === 'Completed' ? now : null;

    // Update work order
    await DB.prepare(
      'UPDATE work_orders SET status = ?, completed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?'
    ).bind(status, completedAt, now, workOrderId, userId).run();

    // Fetch updated work order
    const workOrder = await DB.prepare(
      `SELECT wo.*, a.name as asset_name
       FROM work_orders wo
       LEFT JOIN assets a ON wo.asset_id = a.id
       WHERE wo.id = ?`
    ).bind(workOrderId).first();

    return c.json({
      error: false,
      data: workOrder
    });
  } catch (error) {
    console.error('Error updating work order status:', error);
    return c.json({
      error: true,
      message: 'Failed to update work order status'
    }, 500);
  }
});

// Update work order task
workOrders.patch('/:workOrderId/tasks/:taskId', async (c) => {
  const { DB } = c.env;
  const userId = c.get('userId');
  const workOrderId = c.req.param('workOrderId');
  const taskId = c.req.param('taskId');
  const { is_completed } = await c.req.json();

  if (typeof is_completed !== 'boolean') {
    return c.json({
      error: true,
      message: 'is_completed must be a boolean'
    }, 400);
  }

  try {
    // Verify work order belongs to user
    const workOrder = await DB.prepare(
      'SELECT id FROM work_orders WHERE id = ? AND user_id = ?'
    ).bind(workOrderId, userId).first();

    if (!workOrder) {
      return c.json({
        error: true,
        message: 'Work order not found or access denied'
      }, 404);
    }

    const now = Math.floor(Date.now() / 1000);

    // Update task
    await DB.prepare(
      `UPDATE work_order_tasks
       SET is_completed = ?, completed_at = ?, completed_by = ?
       WHERE id = ? AND work_order_id = ?`
    ).bind(
      is_completed,
      is_completed ? now : null,
      is_completed ? userId : null,
      taskId,
      workOrderId
    ).run();

    // Check if all tasks are completed
    const totalTasks = await DB.prepare(
      'SELECT COUNT(*) as count FROM work_order_tasks WHERE work_order_id = ?'
    ).bind(workOrderId).first();

    const completedTasks = await DB.prepare(
      'SELECT COUNT(*) as count FROM work_order_tasks WHERE work_order_id = ? AND is_completed = 1'
    ).bind(workOrderId).first();

    // Auto-update work order status if all tasks are completed
    if (totalTasks.count === completedTasks.count && totalTasks.count > 0) {
      await DB.prepare(
        'UPDATE work_orders SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?'
      ).bind('Completed', now, now, workOrderId).run();
    }

    return c.json({
      error: false,
      message: 'Task updated successfully'
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return c.json({
      error: true,
      message: 'Failed to update task'
    }, 500);
  }
});

// Delete a work order
workOrders.delete('/:id', async (c) => {
  const { DB } = c.env;
  const userId = c.get('userId');
  const workOrderId = c.req.param('id');

  try {
    // Check if work order exists and belongs to user
    const existingWorkOrder = await DB.prepare(
      'SELECT id FROM work_orders WHERE id = ? AND user_id = ?'
    ).bind(workOrderId, userId).first();

    if (!existingWorkOrder) {
      return c.json({
        error: true,
        message: 'Work order not found or access denied'
      }, 404);
    }

    // Delete work order (cascade will delete tasks)
    await DB.prepare(
      'DELETE FROM work_orders WHERE id = ? AND user_id = ?'
    ).bind(workOrderId, userId).run();

    return c.json({
      error: false,
      message: 'Work order deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting work order:', error);
    return c.json({
      error: true,
      message: 'Failed to delete work order'
    }, 500);
  }
});

export { workOrders as workOrderRoutes };