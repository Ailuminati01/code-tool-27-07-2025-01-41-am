import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit2, Trash2, Save, X, Copy, Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { useDocuments } from '../../contexts/DocumentContext';
import { DocumentType, FormField } from '../../types';
import { databaseService } from '../../services/databaseService';
import { securityService } from '../../services/securityService';
import { useAuth } from '../../contexts/AuthContext';

export function TemplateManager() {
  const { user } = useAuth();
  const { documentTypes, refreshTemplates } = useDocuments();
  const [templates, setTemplates] = useState<DocumentType[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentType | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadTemplates();
  }, [documentTypes]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      // Load templates from database
      const dbTemplates = await databaseService.getAllTemplates();
      
      // Combine built-in templates with custom templates
      const allTemplates = [...documentTypes, ...dbTemplates];
      setTemplates(allTemplates);
      
      console.log('Loaded templates:', allTemplates.length);
    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates(documentTypes);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    const newTemplate: DocumentType = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'New Custom Template',
      category: 'Custom',
      template: [
        {
          id: 'field_1',
          label: 'Sample Field',
          type: 'text',
          required: true
        }
      ],
      validationRules: []
    };
    
    setEditingTemplate(newTemplate);
    setIsCreating(true);
    setIsEditing(true);
    setSaveStatus('idle');
    setErrorMessage('');
  };

  const handleEditTemplate = (template: DocumentType) => {
    // Create a deep copy to avoid modifying the original
    const templateCopy = {
      ...template,
      template: template.template.map(field => ({ ...field })),
      validationRules: [...template.validationRules]
    };
    
    setEditingTemplate(templateCopy);
    setSelectedTemplate(template);
    setIsCreating(false);
    setIsEditing(true);
    setSaveStatus('idle');
    setErrorMessage('');
  };

  const validateTemplate = (template: DocumentType): string | null => {
    if (!template.name.trim()) {
      return 'Template name is required';
    }
    
    if (!template.category.trim()) {
      return 'Template category is required';
    }
    
    if (template.template.length === 0) {
      return 'At least one field is required';
    }
    
    for (const field of template.template) {
      if (!field.label.trim()) {
        return 'All fields must have a label';
      }
      
      if (field.type === 'select' && (!field.options || field.options.length === 0)) {
        return `Select field "${field.label}" must have options`;
      }
    }
    
    return null;
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate || !user) return;

    // Validate template
    const validationError = validateTemplate(editingTemplate);
    if (validationError) {
      setErrorMessage(validationError);
      setSaveStatus('error');
      return;
    }

    try {
      setSaveStatus('saving');
      setErrorMessage('');

      if (isCreating) {
        // Save new template to database
        const savedId = await databaseService.saveTemplate(editingTemplate);
        console.log('Template saved with ID:', savedId);
        
        // Log template creation
        securityService.logAction(
          user.id,
          'template_created',
          'template',
          editingTemplate.id,
          { 
            templateName: editingTemplate.name,
            category: editingTemplate.category,
            fieldsCount: editingTemplate.template.length
          }
        );

        // Add to local state
        setTemplates(prev => [...prev, editingTemplate]);
        setSelectedTemplate(editingTemplate);
        
      } else {
        // Update existing template in database
        const success = await databaseService.updateTemplate(editingTemplate.id, editingTemplate);
        
        if (!success) {
          throw new Error('Failed to update template in database');
        }
        
        console.log('Template updated:', editingTemplate.id);
        
        // Log template update
        securityService.logAction(
          user.id,
          'template_updated',
          'template',
          editingTemplate.id,
          { 
            templateName: editingTemplate.name,
            fieldsCount: editingTemplate.template.length
          }
        );

        // Update local state
        setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? editingTemplate : t));
        setSelectedTemplate(editingTemplate);
      }

      setSaveStatus('success');
      
      // Close editor after a brief success message
      setTimeout(() => {
        setIsEditing(false);
        setIsCreating(false);
        setEditingTemplate(null);
        setSaveStatus('idle');
      }, 1500);

      // Refresh document context to update available templates
      await refreshTemplates();
      
    } catch (error) {
      console.error('Failed to save template:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save template');
      setSaveStatus('error');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!user) return;
    
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    // Prevent deletion of built-in templates
    if (!templateId.startsWith('custom_')) {
      alert('Built-in templates cannot be deleted.');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      
      // Delete from database
      const success = await databaseService.deleteTemplate(templateId);
      
      if (!success) {
        throw new Error('Failed to delete template from database');
      }
      
      console.log('Template deleted:', templateId);
      
      // Log template deletion
      securityService.logAction(
        user.id,
        'template_deleted',
        'template',
        templateId,
        { templateName: template.name, category: template.category }
      );

      // Remove from local state
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
      }
      
      // Refresh document context
      await refreshTemplates();
      
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateTemplate = (template: DocumentType) => {
    const duplicatedTemplate: DocumentType = {
      ...template,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${template.name} (Copy)`,
      template: template.template.map(field => ({
        ...field,
        id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })),
      validationRules: [...template.validationRules]
    };
    
    setEditingTemplate(duplicatedTemplate);
    setIsCreating(true);
    setIsEditing(true);
    setSaveStatus('idle');
    setErrorMessage('');
  };

  const handleAddField = () => {
    if (!editingTemplate) return;
    
    const newField: FormField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label: 'New Field',
      type: 'text',
      required: false
    };
    
    setEditingTemplate({
      ...editingTemplate,
      template: [...editingTemplate.template, newField]
    });
  };

  const handleUpdateField = (index: number, field: FormField) => {
    if (!editingTemplate) return;
    
    const updatedTemplate = { ...editingTemplate };
    updatedTemplate.template[index] = field;
    setEditingTemplate(updatedTemplate);
  };

  const handleRemoveField = (index: number) => {
    if (!editingTemplate || editingTemplate.template.length <= 1) {
      alert('Template must have at least one field');
      return;
    }
    
    const updatedTemplate = { ...editingTemplate };
    updatedTemplate.template.splice(index, 1);
    setEditingTemplate(updatedTemplate);
  };

  const exportTemplate = (template: DocumentType) => {
    const exportData = {
      ...template,
      exportedAt: new Date().toISOString(),
      exportedBy: user?.fullName,
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `template_${template.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (user) {
      securityService.logAction(
        user.id,
        'template_exported',
        'template',
        template.id,
        { templateName: template.name }
      );
    }
  };

  const handleImportTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedTemplate = JSON.parse(e.target?.result as string);
        
        // Validate template structure
        if (!importedTemplate.name || !importedTemplate.template || !Array.isArray(importedTemplate.template)) {
          throw new Error('Invalid template format');
        }

        // Generate new IDs
        const newTemplate: DocumentType = {
          id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: `${importedTemplate.name} (Imported)`,
          category: importedTemplate.category || 'Custom',
          template: importedTemplate.template.map((field: any) => ({
            id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            label: field.label || 'Imported Field',
            type: field.type || 'text',
            required: field.required || false,
            options: field.options || undefined
          })),
          validationRules: importedTemplate.validationRules || []
        };

        setEditingTemplate(newTemplate);
        setIsCreating(true);
        setIsEditing(true);
        setShowImportModal(false);
        setSaveStatus('idle');
        setErrorMessage('');
        
      } catch (error) {
        alert('Failed to import template. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setIsCreating(false);
    setEditingTemplate(null);
    setSaveStatus('idle');
    setErrorMessage('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Template Management</h2>
            <p className="text-sm text-gray-600 mt-1">
              Create and manage document templates for data extraction
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </button>
            <button
              onClick={handleCreateTemplate}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {saveStatus === 'success' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm text-green-800">Template saved successfully!</span>
            </div>
          </div>
        )}

        {saveStatus === 'error' && errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-sm text-red-800">{errorMessage}</span>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template List */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900">Templates ({templates.length})</h3>
            <div className="max-h-96 overflow-y-auto space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{template.name}</h4>
                      <p className="text-sm text-gray-500">{template.category}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs text-gray-400">
                          {template.template.length} fields
                        </span>
                        {template.id.startsWith('custom_') ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Custom
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Built-in
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col space-y-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTemplate(template);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        title="Edit Template"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateTemplate(template);
                        }}
                        className="p-1 text-green-600 hover:bg-green-100 rounded"
                        title="Duplicate Template"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportTemplate(template);
                        }}
                        className="p-1 text-purple-600 hover:bg-purple-100 rounded"
                        title="Export Template"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {template.id.startsWith('custom_') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template.id);
                          }}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                          title="Delete Template"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Template Details/Editor */}
          <div className="lg:col-span-2">
            {isEditing ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    {isCreating ? 'Create New Template' : 'Edit Template'}
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveTemplate}
                      disabled={saveStatus === 'saving'}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {saveStatus === 'saving' ? 'Saving...' : 'Save Template'}
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={saveStatus === 'saving'}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </button>
                  </div>
                </div>

                {editingTemplate && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Template Name *
                        </label>
                        <input
                          type="text"
                          value={editingTemplate.name}
                          onChange={(e) => setEditingTemplate({
                            ...editingTemplate,
                            name: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter template name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category *
                        </label>
                        <select
                          value={editingTemplate.category}
                          onChange={(e) => setEditingTemplate({
                            ...editingTemplate,
                            category: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Administrative">Administrative</option>
                          <option value="Recognition">Recognition</option>
                          <option value="Disciplinary">Disciplinary</option>
                          <option value="Legal">Legal</option>
                          <option value="Custom">Custom</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-md font-medium text-gray-900">Form Fields</h4>
                        <button
                          onClick={handleAddField}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-600 bg-blue-100 hover:bg-blue-200"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Field
                        </button>
                      </div>

                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {editingTemplate.template.map((field, index) => (
                          <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="grid grid-cols-12 gap-3 items-end">
                              <div className="col-span-3">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Label *
                                </label>
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={(e) => handleUpdateField(index, {
                                    ...field,
                                    label: e.target.value
                                  })}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="Field label"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Type *
                                </label>
                                <select
                                  value={field.type}
                                  onChange={(e) => handleUpdateField(index, {
                                    ...field,
                                    type: e.target.value as any
                                  })}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  <option value="text">Text</option>
                                  <option value="number">Number</option>
                                  <option value="date">Date</option>
                                  <option value="select">Select</option>
                                  <option value="textarea">Textarea</option>
                                </select>
                              </div>
                              <div className="col-span-3">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Options (comma-separated)
                                </label>
                                <input
                                  type="text"
                                  value={field.options?.join(', ') || ''}
                                  onChange={(e) => handleUpdateField(index, {
                                    ...field,
                                    options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                  })}
                                  disabled={field.type !== 'select'}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                                  placeholder="Option1, Option2, Option3"
                                />
                              </div>
                              <div className="col-span-2">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`required-${index}`}
                                    checked={field.required}
                                    onChange={(e) => handleUpdateField(index, {
                                      ...field,
                                      required: e.target.checked
                                    })}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <label htmlFor={`required-${index}`} className="text-xs text-gray-700">
                                    Required
                                  </label>
                                </div>
                              </div>
                              <div className="col-span-2">
                                <button
                                  onClick={() => handleRemoveField(index)}
                                  disabled={editingTemplate.template.length <= 1}
                                  className="w-full p-1 text-red-600 hover:bg-red-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Remove Field"
                                >
                                  <Trash2 className="h-4 w-4 mx-auto" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : selectedTemplate ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Template Details</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => exportTemplate(selectedTemplate)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </button>
                    <button
                      onClick={() => handleEditTemplate(selectedTemplate)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Template
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-medium text-gray-900 mb-2">
                      {selectedTemplate.name}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Category:</span>
                        <span className="ml-2 text-gray-600">{selectedTemplate.category}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Fields:</span>
                        <span className="ml-2 text-gray-600">{selectedTemplate.template.length}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Type:</span>
                        <span className="ml-2 text-gray-600">
                          {selectedTemplate.id.startsWith('custom_') ? 'Custom' : 'Built-in'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">ID:</span>
                        <span className="ml-2 text-gray-600 font-mono text-xs">{selectedTemplate.id}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Form Fields</h4>
                    <div className="space-y-2">
                      {selectedTemplate.template.map((field, index) => (
                        <div key={field.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium text-gray-900">{field.label}</span>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                {field.type}
                              </span>
                              {field.required && (
                                <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
                                  Required
                                </span>
                              )}
                            </div>
                          </div>
                          {field.options && field.options.length > 0 && (
                            <div className="text-sm text-gray-600 max-w-xs">
                              <span className="font-medium">Options:</span> {field.options.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Select a template to view details</p>
                  <p className="text-sm text-gray-400 mt-2">Or create a new template to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Import Template</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Template File (JSON)
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportTemplate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="text-sm text-gray-600">
                <p>Import a previously exported template file. The template will be validated and you can edit it before saving.</p>
              </div>
            </div>
            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => setShowImportModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}