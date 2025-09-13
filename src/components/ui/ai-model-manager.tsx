import React, { useState, useEffect } from 'react'
import { AIModel, AIModelCategory, AIModelType } from '../../types'
import { getAIModels } from '../../utils/configLoader'

/**
 * AI模型管理组件属性接口
 */
interface AIModelManagerProps {
  isOpen: boolean
  onClose: () => void
  onModelUpdate?: (categories: AIModelCategory[]) => void
}

/**
 * AI模型管理组件
 * 支持分类展示、添加、编辑和删除AI模型
 */
export function AIModelManager({ isOpen, onClose, onModelUpdate }: AIModelManagerProps) {
  const [categories, setCategories] = useState<AIModelCategory[]>([])
  const [editingModel, setEditingModel] = useState<AIModel | null>(null)
  const [isAddingModel, setIsAddingModel] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<AIModelType>(AIModelType.LANGUAGE)
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    type: AIModelType.LANGUAGE,
    url: '',
    selectedColor: '#10a37f'
  })

  /**
   * 加载AI模型数据
   */
  useEffect(() => {
    if (isOpen) {
      const modelCategories = getAIModels()
      setCategories(modelCategories)
    }
  }, [isOpen])

  /**
   * 重置表单数据
   */
  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      type: AIModelType.LANGUAGE,
      url: '',
      selectedColor: '#10a37f'
    })
    setEditingModel(null)
    setIsAddingModel(false)
  }

  /**
   * 开始添加新模型
   */
  const startAddingModel = (categoryType: AIModelType) => {
    setSelectedCategory(categoryType)
    setFormData({
      id: '',
      name: '',
      type: categoryType,
      url: '',
      selectedColor: categoryType === AIModelType.LANGUAGE ? '#10a37f' : '#ff4081'
    })
    setIsAddingModel(true)
  }

  /**
   * 开始编辑模型
   */
  const startEditingModel = (model: AIModel) => {
    setFormData({
      id: model.id,
      name: model.name,
      type: model.type,
      url: model.url,
      selectedColor: model.selectedColor
    })
    setEditingModel(model)
    setIsAddingModel(false)
  }

  /**
   * 保存模型（添加或编辑）
   */
  const saveModel = () => {
    if (!formData.name.trim() || !formData.id.trim()) {
      alert('请填写完整的模型信息')
      return
    }

    const newCategories = categories.map(category => {
      if (category.type === formData.type) {
        const models = [...category.models]
        
        if (editingModel) {
          // 编辑现有模型
          const index = models.findIndex(m => m.id === editingModel.id)
          if (index !== -1) {
            models[index] = { ...formData }
          }
        } else {
          // 添加新模型
          if (models.some(m => m.id === formData.id)) {
            alert('模型ID已存在，请使用不同的ID')
            return category
          }
          models.push({ ...formData })
        }
        
        return { ...category, models }
      }
      return category
    })

    setCategories(newCategories)
    onModelUpdate?.(newCategories)
    resetForm()
  }

  /**
   * 删除模型
   */
  const deleteModel = (modelId: string, categoryType: AIModelType) => {
    if (!confirm('确定要删除这个模型吗？')) {
      return
    }

    const newCategories = categories.map(category => {
      if (category.type === categoryType) {
        return {
          ...category,
          models: category.models.filter(m => m.id !== modelId)
        }
      }
      return category
    })

    setCategories(newCategories)
    onModelUpdate?.(newCategories)
  }

  /**
   * 处理表单输入变化
   */
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">AI模型管理</h2>
          <button
            onClick={() => {
              resetForm()
              onClose()
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex h-[calc(90vh-120px)]">
          {/* 左侧：模型列表 */}
          <div className="flex-1 p-6 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
            {categories.map((category) => (
              <div key={category.type} className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                      {category.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {category.description}
                    </p>
                  </div>
                  <button
                    onClick={() => startAddingModel(category.type)}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                  >
                    添加模型
                  </button>
                </div>
                
                <div className="grid gap-3">
                  {category.models.map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: model.selectedColor }}
                        />
                        <div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {model.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            ID: {model.id} | URL: {model.url}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEditingModel(model)}
                          className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteModel(model.id, category.type)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="删除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 右侧：编辑表单 */}
          {(isAddingModel || editingModel) && (
            <div className="w-80 p-6 bg-gray-50 dark:bg-gray-900">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                {editingModel ? '编辑模型' : '添加新模型'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    模型ID
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => handleInputChange('id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例如: gpt-4"
                    disabled={!!editingModel}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    模型名称
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例如: GPT-4"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    官方网址
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => handleInputChange('url', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    选中颜色
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.selectedColor}
                      onChange={(e) => handleInputChange('selectedColor', e.target.value)}
                      className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.selectedColor}
                      onChange={(e) => handleInputChange('selectedColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="#10a37f"
                    />
                  </div>
                </div>
                
                <div className="flex space-x-2 pt-4">
                  <button
                    onClick={saveModel}
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    {editingModel ? '保存' : '添加'}
                  </button>
                  <button
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AIModelManager