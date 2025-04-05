import { NextRequest, NextResponse } from 'next/server';
import { tagsAPI } from '../../lib/storage';

// GET /api/tags - Retrieve all tags
export async function GET() {
  try {
    // Client-side rendering will handle the actual API call
    if (typeof window === 'undefined') {
      // For server-side rendering, return an empty array to prevent errors
      return NextResponse.json({
        status: 'success',
        data: []
      });
    }
    
    const tags = await tagsAPI.getAll();
    
    return NextResponse.json({
      status: 'success',
      data: tags
    });
  } catch (error) {
    console.error('Error retrieving tags:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to retrieve tags'
    }, { status: 500 });
  }
}

// POST /api/tags - Create a new tag
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    
    if (!name) {
      return NextResponse.json({
        status: 'error',
        message: 'Tag name is required'
      }, { status: 400 });
    }
    
    // Check if tag with this name already exists
    let existingTags;
    try {
      existingTags = await tagsAPI.getAll();
    } catch (error) {
      // If server-side, return a suitable response
      return NextResponse.json({
        status: 'error',
        message: 'This operation is only available on the client side'
      }, { status: 400 });
    }
    
    const existingTag = existingTags.find(tag => 
      tag.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existingTag) {
      return NextResponse.json({
        status: 'success',
        message: 'Tag already exists',
        data: existingTag
      });
    }
    
    // Create new tag
    const newTag = await tagsAPI.add({
      name: name.trim(),
      color: generateRandomColor()
    });
    
    return NextResponse.json({
      status: 'success',
      message: 'Tag created successfully',
      data: newTag
    });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to create tag'
    }, { status: 500 });
  }
}

// Helper function to generate a random color for a tag
function generateRandomColor(): string {
  const colors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#f97316', // orange
    '#8b5cf6', // purple
    '#10b981', // green
    '#6366f1', // indigo
    '#f59e0b', // amber
    '#ec4899', // pink
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
}

// PUT /api/tags/:id - Update a tag
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get the path parameter (/:id part of the route)
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    
    // Extract the updated name from the request body
    const { name } = await request.json();
    
    if (!id || !name) {
      return NextResponse.json({
        status: 'error',
        message: 'Tag ID and name are required'
      }, { status: 400 });
    }
    
    // Check if tag exists
    let tag = await tagsAPI.getById(id);
    
    if (!tag) {
      return NextResponse.json({
        status: 'error',
        message: 'Tag not found'
      }, { status: 404 });
    }
    
    // Check if new name conflicts with existing tag
    const existingTags = await tagsAPI.getAll();
    const duplicateTag = existingTags.find(t => 
      t.id !== id && t.name.toLowerCase() === name.toLowerCase()
    );
    
    if (duplicateTag) {
      return NextResponse.json({
        status: 'error',
        message: 'Another tag with this name already exists'
      }, { status: 409 });
    }
    
    // Update tag
    const updatedTag = {
      ...tag,
      name: name.trim()
    };
    
    await tagsAPI.update(updatedTag);
    
    return NextResponse.json({
      status: 'success',
      message: 'Tag updated successfully',
      data: updatedTag
    });
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to update tag'
    }, { status: 500 });
  }
}

// DELETE /api/tags/:id - Delete a tag
export async function DELETE(request: NextRequest) {
  try {
    // Get the path parameter (/:id part of the route)
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json({
        status: 'error',
        message: 'Tag ID is required'
      }, { status: 400 });
    }
    
    // Check if tag exists
    const tag = await tagsAPI.getById(id);
    
    if (!tag) {
      return NextResponse.json({
        status: 'error',
        message: 'Tag not found'
      }, { status: 404 });
    }
    
    // Delete tag
    await tagsAPI.delete(id);
    
    return NextResponse.json({
      status: 'success',
      message: 'Tag deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to delete tag'
    }, { status: 500 });
  }
} 