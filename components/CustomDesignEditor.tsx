'use client'

import { useState, useRef } from 'react'
import { DndContext, DragEndEvent, useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { HexColorPicker } from 'react-colorful'
import { 
  Upload, Type, Image as ImageIcon, Trash2, ZoomIn, ZoomOut, RotateCw, Save, 
  ChevronDown, Plus, Edit2, Check, X 
} from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { 
  PRODUCT_CONFIGS, 
  ProductType, 
  ProductAngle, 
  ProductColor, 
  ProductSize,
  COLOR_LABELS,
  COLOR_HEX
} from '@/lib/product-config'

interface DesignElement {
  id: string
  type: 'image' | 'text'
  position: { x: number; y: number }
  
  // Image properties
  imageUrl?: string
  imageWidth?: number
  imageHeight?: number
  rotation?: number
  
  // Text properties
  text?: string
  fontSize?: number
  fontFamily?: string
  color?: string
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
}

interface AngleDesign {
  angle: ProductAngle
  angleName: string
  elements: DesignElement[]
}

// Draggable Element Component with Resize Handles
function DraggableElement({ 
  id, 
  element, 
  isSelected, 
  onSelect,
  onResize
}: {
  id: string
  element: DesignElement
  isSelected: boolean
  onSelect: () => void
  onResize: (id: string, newWidth: number, newHeight: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: id,
  })
  
  const style = {
    position: 'absolute' as const,
    left: element.position.x,
    top: element.position.y,
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    cursor: 'move',
  }

  // Resize handler
  const handleResizeMouseDown = (e: React.MouseEvent, corner: 'nw' | 'ne' | 'sw' | 'se') => {
    e.stopPropagation()
    e.preventDefault()

    const startX = e.clientX
    const startY = e.clientY
    const startWidth = element.imageWidth || element.fontSize || 100
    const startHeight = element.imageHeight || element.fontSize || 100

    const doDrag = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY

      let newWidth = startWidth
      let newHeight = startHeight

      if (corner.includes('e')) newWidth = startWidth + dx
      if (corner.includes('w')) newWidth = startWidth - dx
      if (corner.includes('s')) newHeight = startHeight + dy
      if (corner.includes('n')) newHeight = startHeight - dy

      // Min/max sınırları (görsel 40-50px arasında, text 15px max)
      if (element.type === 'image') {
        newWidth = Math.max(40, Math.min(50, newWidth))
        newHeight = Math.max(40, Math.min(50, newHeight))
      } else {
        // Text için max font size 15px
        const avgSize = (newWidth + newHeight) / 2
        const constrainedSize = Math.max(8, Math.min(15, avgSize))
        newWidth = constrainedSize
        newHeight = constrainedSize
      }

      onResize(id, newWidth, newHeight)
    }

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag)
      document.removeEventListener('mouseup', stopDrag)
    }

    document.addEventListener('mousemove', doDrag)
    document.addEventListener('mouseup', stopDrag)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      className={`relative ${isSelected ? 'ring-2 ring-purple-500' : ''}`}
    >
      {element.type === 'image' ? (
        <img
          src={element.imageUrl}
          alt="Design element"
          style={{
            width: element.imageWidth || 45,
            height: element.imageHeight || 45,
            transform: `rotate(${element.rotation || 0}deg)`,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
          draggable={false}
        />
      ) : (
        <div
          className="text-gray-900"
          style={{
            fontSize: `${element.fontSize || 12}px`,
            fontFamily: element.fontFamily,
            color: element.color,
            fontWeight: element.fontWeight,
            fontStyle: element.fontStyle,
            whiteSpace: 'nowrap',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {element.text}
        </div>
      )}
      {isSelected && (
        <>
          {['nw', 'ne', 'sw', 'se'].map(corner => (
            <div
              key={corner}
              className={`absolute w-4 h-4 bg-white border-2 border-purple-500 rounded-full cursor-${corner}-resize hover:bg-purple-500 transition-colors z-10`}
              style={{
                top: corner.includes('n') ? -8 : 'auto',
                bottom: corner.includes('s') ? -8 : 'auto',
                left: corner.includes('w') ? -8 : 'auto',
                right: corner.includes('e') ? -8 : 'auto',
              }}
              onMouseDown={(e) => handleResizeMouseDown(e, corner as any)}
            />
          ))}
        </>
      )}
    </div>
  )
}

interface CustomDesignEditorProps {
  productImage: string
  productName: string
  productColor?: string
  onSave: (design: DesignElement[]) => void
}

export default function CustomDesignEditor({ 
  productImage, 
  productName,
  productColor = 'white',
  onSave 
}: CustomDesignEditorProps) {
  // Product configuration state
  const [selectedProduct, setSelectedProduct] = useState<ProductType>('tshirt')
  const [selectedAngle, setSelectedAngle] = useState<ProductAngle>('front-chest')
  const [selectedColor, setSelectedColor] = useState<ProductColor>('white')
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>('M')
  
  // Multi-angle designs
  const [angleDesigns, setAngleDesigns] = useState<AngleDesign[]>([
    { angle: 'front-chest', angleName: 'Ön Göğüs', elements: [] }
  ])
  const [currentAngleIndex, setCurrentAngleIndex] = useState(0)
  
  // Elements state (current angle'ın elementleri)
  const [elements, setElements] = useState<DesignElement[]>([])
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  
  // UI state
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showAddAngleDialog, setShowAddAngleDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Text editor state
  const [textInput, setTextInput] = useState('')
  const [fontSize, setFontSize] = useState(12) // Max 15px
  const [fontFamily, setFontFamily] = useState('Arial')
  const [textColor, setTextColor] = useState('#000000')
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('normal')
  const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>('normal')
  
  // Custom prompt for AI
  const [customPrompt, setCustomPrompt] = useState('')

  // Current product config
  const productConfig = PRODUCT_CONFIGS[selectedProduct]
  
  // Current mockup URL
  const mockupUrl = `/mockups/${selectedProduct}/${selectedColor}/${selectedAngle}.png`
  
  // Update elements when changing angles
  const switchToAngle = (angleIndex: number) => {
    // Save current angle's elements
    setAngleDesigns(prev => prev.map((design, idx) => 
      idx === currentAngleIndex ? { ...design, elements } : design
    ))
    
    // Load new angle's elements
    setCurrentAngleIndex(angleIndex)
    setElements(angleDesigns[angleIndex].elements)
    setSelectedAngle(angleDesigns[angleIndex].angle)
    setSelectedElement(null)
  }

  // Drag end handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event
    
    setElements(prev => prev.map(el => {
      if (el.id === active.id) {
        return {
          ...el,
          position: {
            x: el.position.x + delta.x,
            y: el.position.y + delta.y,
          },
        }
      }
      return el
    }))
  }

  // Image upload with AI conversion
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu 5MB\'dan küçük olmalı')
      return
    }

    setUploadingImage(true)

    try {
      const reader = new FileReader()
      
      reader.onload = async (event) => {
        const imageUrl = event.target?.result as string
        const tempId = `img-${Date.now()}`
        
        toast.loading('📸 Görsel yükleniyor...', { id: 'ai-conversion' })
        
        try {
          toast.loading('🤖 AI görsel analizi yapılıyor...', { id: 'ai-conversion' })
          
          // Build prompt (custom prompt + base prompt)
          const basePrompt = 'Use uploaded photo as reference. Keep silhouette and pose. Single character. 64x64 pixel-art sprite, flat solid colors only, one color per area, black outlines, max 12 colors, hair one rounded blob, transparent background, no shading/highlights/gradients/texture.'
          const finalPrompt = customPrompt ? `${customPrompt}\n\n${basePrompt}` : basePrompt
          
          const response = await fetch('/api/ai/convert-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageUrl,
              prompt: finalPrompt,
            }),
          })

          toast.loading('🎨 Pixel art oluşturuluyor...', { id: 'ai-conversion' })

          const data = await response.json()
          
          if (data.success && data.convertedImageUrl) {
            const newElement: DesignElement = {
              id: tempId,
              type: 'image',
              position: { x: 50, y: 50 },
              imageUrl: data.convertedImageUrl,
              imageWidth: 45, // Default 45px (40-50 arası)
              imageHeight: 45,
              rotation: 0,
            }
            
            setElements(prev => [...prev, newElement])
            setSelectedElement(tempId)
            toast.success(`✨ Pixel art dönüşümü tamamlandı! (${data.method || 'unknown'})`, { id: 'ai-conversion' })
            
            // Show add angle dialog if multiple angles available
            if (productConfig.angles.length > 1 && angleDesigns.length < productConfig.angles.length) {
              setTimeout(() => setShowAddAngleDialog(true), 1500)
            }
          } else {
            toast.error(`❌ AI dönüşümü başarısız: ${data.error || 'Bilinmeyen hata'}`, { id: 'ai-conversion' })
          }
        } catch (error: any) {
          toast.error('❌ AI dönüşümü sırasında hata oluştu', { id: 'ai-conversion' })
        }
      }
      
      reader.readAsDataURL(file)
    } catch (error) {
      toast.error('Görsel yüklenemedi')
    } finally {
      setUploadingImage(false)
    }
  }

  // Add text
  const handleAddText = () => {
    if (!textInput.trim()) {
      toast.error('Lütfen bir metin girin')
      return
    }

    const newElement: DesignElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      position: { x: 100, y: 100 },
      text: textInput,
      fontSize: Math.min(fontSize, 15), // Max 15px
      fontFamily,
      color: textColor,
      fontWeight,
      fontStyle,
    }

    setElements(prev => [...prev, newElement])
    setSelectedElement(newElement.id)
    setTextInput('')
  }

  // Resize handler
  const handleResize = (id: string, newWidth: number, newHeight: number) => {
    setElements(prev => prev.map(el => {
      if (el.id === id) {
        if (el.type === 'image') {
          return { ...el, imageWidth: newWidth, imageHeight: newHeight }
        } else {
          // For text, use average as fontSize
          const avgSize = (newWidth + newHeight) / 2
          return { ...el, fontSize: Math.min(avgSize, 15) } // Max 15px
        }
      }
      return el
    }))
  }

  // Delete element
  const handleDeleteElement = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id))
    if (selectedElement === id) {
      setSelectedElement(null)
    }
  }

  // Add new angle
  const handleAddNewAngle = (angle: ProductAngle, angleName: string) => {
    if (angleDesigns.some(d => d.angle === angle)) {
      toast.error('Bu açı zaten mevcut')
      return
    }
    
    setAngleDesigns(prev => [...prev, { angle, angleName, elements: [] }])
    switchToAngle(angleDesigns.length) // Switch to new angle
    setShowAddAngleDialog(false)
    toast.success(`${angleName} açısı eklendi`)
  }

  // Product change
  const handleProductChange = (newProduct: ProductType) => {
    setSelectedProduct(newProduct)
    const newConfig = PRODUCT_CONFIGS[newProduct]
    setSelectedAngle(newConfig.angles[0].id)
    setSelectedColor('white')
    setSelectedSize(newConfig.sizes ? newConfig.sizes[0] : null)
    setAngleDesigns([{ angle: newConfig.angles[0].id, angleName: newConfig.angles[0].name, elements: [] }])
    setCurrentAngleIndex(0)
    setElements([])
    setSelectedElement(null)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Toaster position="top-center" />
      
      {/* Left Panel - Product Configuration */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Ürün Ayarları</h3>
        
        {/* Product Type Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">Ürün Tipi</label>
          <select
            value={selectedProduct}
            onChange={(e) => handleProductChange(e.target.value as ProductType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500"
          >
            {Object.values(PRODUCT_CONFIGS).map(config => (
              <option key={config.id} value={config.id}>{config.name}</option>
            ))}
          </select>
        </div>

        {/* Angle Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">Açı</label>
          <div className="space-y-2">
            {angleDesigns.map((design, idx) => (
              <button
                key={design.angle}
                onClick={() => switchToAngle(idx)}
                className={`w-full px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                  currentAngleIndex === idx
                    ? 'bg-purple-100 text-purple-900 font-medium'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {design.angleName} {design.elements.length > 0 && `(${design.elements.length})`}
              </button>
            ))}
            {angleDesigns.length < productConfig.angles.length && (
              <button
                onClick={() => setShowAddAngleDialog(true)}
                className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-500 hover:text-purple-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                <span className="text-sm">Yeni Açı Ekle</span>
              </button>
            )}
          </div>
        </div>

        {/* Color Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">Renk</label>
          <div className="grid grid-cols-4 gap-2">
            {productConfig.colors.map(color => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`h-12 rounded-lg border-2 transition-all ${
                  selectedColor === color
                    ? 'border-purple-500 ring-2 ring-purple-200'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{ backgroundColor: COLOR_HEX[color] }}
                title={COLOR_LABELS[color]}
              />
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2">{COLOR_LABELS[selectedColor]}</p>
        </div>

        {/* Size Selector (conditional) */}
        {productConfig.sizes && productConfig.sizes.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">Beden</label>
            <div className="flex flex-wrap gap-2">
              {productConfig.sizes.map(size => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedSize === size
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        <hr className="my-6 border-gray-200" />

        {/* Element List */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Tasarım Öğeleri ({elements.length})</h4>
          {elements.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Henüz öğe eklenmedi</p>
          ) : (
            <div className="space-y-2">
              {elements.map(el => (
                <div
                  key={el.id}
                  onClick={() => setSelectedElement(el.id)}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedElement === el.id
                      ? 'bg-purple-100 border-2 border-purple-500'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {el.type === 'image' ? <ImageIcon size={16} /> : <Type size={16} />}
                    <span className="text-sm text-gray-900">
                      {el.type === 'image' ? 'Görsel' : el.text?.substring(0, 20)}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteElement(el.id)
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center - Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">{productConfig.name} Tasarımı</h2>
            <span className="text-sm text-gray-600">
              {angleDesigns[currentAngleIndex].angleName} - {COLOR_LABELS[selectedColor]}
            </span>
          </div>
          <button
            onClick={() => {
              // Save all angle designs
              const finalDesigns = angleDesigns.map((design, idx) => 
                idx === currentAngleIndex ? { ...design, elements } : design
              )
              console.log('Saving designs:', finalDesigns)
              toast.success('Tasarım kaydedildi!')
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Save size={18} />
            Kaydet
          </button>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center p-8">
          <DndContext onDragEnd={handleDragEnd}>
            <div
              className="relative bg-gray-100 border-4 border-gray-300 rounded-lg shadow-xl"
              style={{ width: 600, height: 600 }}
              onClick={() => setSelectedElement(null)}
            >
              {/* Mockup Background */}
              <img
                src={mockupUrl}
                alt={`${productConfig.name} mockup`}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                onError={(e) => {
                  // Fallback to white t-shirt
                  e.currentTarget.src = '/white-tshirt.png'
                }}
              />
              
              {/* Design Elements */}
              {elements.map(element => (
                <DraggableElement
                  key={element.id}
                  id={element.id}
                  element={element}
                  isSelected={selectedElement === element.id}
                  onSelect={() => setSelectedElement(element.id)}
                  onResize={handleResize}
                />
              ))}
            </div>
          </DndContext>
        </div>
      </div>

      {/* Right Panel - Tools */}
      <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Tasarım Araçları</h3>

        {/* Image Upload */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Görsel Ekle</h4>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Upload size={18} />
            {uploadingImage ? 'Yükleniyor...' : 'Görsel Yükle'}
          </button>
          <p className="text-xs text-gray-600 mt-2">Max 5MB, AI ile pixel art'a dönüştürülecek</p>
        </div>

        {/* Custom AI Prompt */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Ek AI Talimatları (Opsiyonel)</h4>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Örn: Karakterin yüzü gülüyor olsun, kıyafeti mavi olsun, vb..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm resize-none focus:ring-2 focus:ring-purple-500"
            rows={4}
          />
          <p className="text-xs text-gray-600 mt-1">
            Bu talimatlar ana akışı bozmadıkça önceliklendirilir
          </p>
        </div>

        <hr className="my-6 border-gray-200" />

        {/* Text Tools */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Metin Ekle</h4>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Metin girin..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 mb-3 focus:ring-2 focus:ring-purple-500"
            onKeyPress={(e) => e.key === 'Enter' && handleAddText()}
          />
          
          <div className="space-y-3 mb-3">
            <div>
              <label className="block text-xs text-gray-700 mb-1">Boyut (Max 15px)</label>
              <input
                type="range"
                min="8"
                max="15"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-xs text-gray-600">{fontSize}px</span>
            </div>

            <div>
              <label className="block text-xs text-gray-700 mb-1">Font</label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900 text-sm"
              >
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-700 mb-1">Renk</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-gray-900 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
                className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${
                  fontWeight === 'bold'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <strong>B</strong>
              </button>
              <button
                onClick={() => setFontStyle(fontStyle === 'italic' ? 'normal' : 'italic')}
                className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${
                  fontStyle === 'italic'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <em>I</em>
              </button>
            </div>
          </div>

          <button
            onClick={handleAddText}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Type size={18} />
            Metin Ekle
          </button>
        </div>

        {/* Element Actions */}
        {selectedElement && (
          <>
            <hr className="my-6 border-gray-200" />
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Seçili Öğe</h4>
              <div className="space-y-2">
                <button
                  onClick={() => handleDeleteElement(selectedElement)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Sil
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Angle Dialog */}
      {showAddAngleDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Aynı ürünün başka yerine ekleme yapmak ister misiniz?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Şu anda <strong>{angleDesigns[currentAngleIndex].angleName}</strong> açısındasınız.
              Başka bir açı seçerek aynı tasarımı farklı yerlere ekleyebilirsiniz.
            </p>
            <div className="space-y-2 mb-4">
              {productConfig.angles
                .filter(angle => !angleDesigns.some(d => d.angle === angle.id))
                .map(angle => (
                  <button
                    key={angle.id}
                    onClick={() => handleAddNewAngle(angle.id, angle.name)}
                    className="w-full px-4 py-2 bg-purple-100 text-purple-900 rounded-lg hover:bg-purple-200 transition-colors text-left"
                  >
                    {angle.name}
                  </button>
                ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddAngleDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Hayır, Devam Et
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
