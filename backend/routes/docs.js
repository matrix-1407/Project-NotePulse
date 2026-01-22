import express from 'express';

const router = express.Router();

/**
 * POST /api/docs
 * Create a new document
 * TODO: Verify JWT token when auth is implemented
 * TODO: Set owner_id to authenticated user's ID
 * Body: { title: string }
 */
router.post('/', async (req, res) => {
  try {
    const { title = 'Untitled Document' } = req.body;
    // TODO: Get user ID from JWT token
    const userId = 'placeholder-user-id';

    // For scaffold, return a mock document ID
    const docId = `doc-${Date.now()}`;
    console.log(`Created document: ${docId} with title: "${title}"`);

    res.json({
      id: docId,
      title,
      owner_id: userId,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

/**
 * GET /api/docs
 * List documents for authenticated user
 * TODO: Verify JWT token and fetch user's documents from Supabase
 */
router.get('/', async (req, res) => {
  try {
    // For scaffold, return empty list
    res.json({ documents: [] });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

/**
 * POST /api/docs/:id/save
 * Save document snapshot
 * TODO: Use supabaseAdmin to insert into document_versions table
 * TODO: Update documents table with latest content and updated_at
 * Body: { content: object, snapshot: object }
 */
router.post('/:id/save', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, snapshot } = req.body;

    console.log(`Saving document: ${id}`);
    // TODO: Persist snapshot to Supabase via supabaseAdmin
    // Example:
    // const { error } = await supabaseAdmin
    //   .from('document_versions')
    //   .insert({ document_id: id, content: snapshot });

    res.json({
      id,
      success: true,
      message: 'Document saved (persistence not yet configured)',
    });
  } catch (error) {
    console.error('Error saving document:', error);
    res.status(500).json({ error: 'Failed to save document' });
  }
});

export default router;
