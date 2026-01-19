'use client'

import { useState, useRef } from 'react'
import { DndContext, DragEndEvent, useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { HexColorPicker } from 'react-colorful'
import { 
  Upload, Type, Trash2, Save, Plus, Edit2, Check, X, ShoppingCart
} from 'lucide-react'
import { toast } from 'sonner'
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
  imageUrl?: string
  imageWidth?: number
  imageHeight?: number
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

interface CustomDesignEditorProps {
  productImage: string
  productName: string
  productColor?: string
  onSave: (design: AngleDesign[]) => void
}

// Product type icons
const PRODUCT_ICONS: Record<ProductType, string> = {
  tshirt: '👕',
  sweatshirt: '🧥',
  hat: '🧢',
  bag: '👜',
  keychain: '🔑'
}

// Angle icons
const ANGLE_ICONS: Record<string, string> = {
  'front-chest': '🎯',
  'right-sleeve': '➡️',
  'left-sleeve': '⬅️',
  'back': '🔙',
  'front-forehead': '🎯',
  'right-side': '➡️',
  'left-side': '⬅️',
  'front-face': '🎯',
  'side-pocket': '💼',
  'flat-white': '⬜'
}

// Modals
function AIInstructionsModal({ 
  isOpen, 
  onClose, 
  onConfirm 
}: { 
  isOpen: boolean
  onClose: () => void
  onConfirm: (instructions: string, file: File) => void
}) {
  const [instructions, setInstructions] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleConfirm = () => {
    if (!selectedFile) {
      toast.error('Lütfen bir görsel seçin')
      return
    }
    onConfirm(instructions, selectedFile)
    onClose()
    setInstructions('')
    setSelectedFile(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-2xl font-bold mb-4 text-gray-900">🎨 Görsel Yükle</h3>
        
        <div className="mb-6">
          <label className="block font-semibold mb-2 text-gray-900">Görsel Seçin:</label>
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2"
            >
              <Upload size={20} />
              Dosya Seç
            </button>
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              📷 Resim Çek
            </button>
          </div>
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input 
            ref={cameraInputRef}
            type="file" 
            accept="image/*"
            capture="environment"
            onChange={handleCameraCapture}
            className="hidden"
          />
          {selectedFile && (
            <p className="text-sm text-green-600 mt-2">✓ {selectedFile.name}</p>
          )}
        </div>

        <div className="mb-6">
          <label className="block font-semibold mb-2 text-gray-900">Ek AI Talimatları (Opsiyonel):</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Örn: Karakterin yüzü gülüyor olsun, mavi renk olsun..."
            className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
          />
          <p className="text-xs text-gray-600 mt-1">
            Bu talimatlar ana akışı bozmadıkça önceliklendirilir
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-900"
          >
            İptal
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Yükle ve Dönüştür
          </button>
        </div>
      </div>
    </div>
  )
}

// AI Processing Modal
function AIProcessingModal({ 
  isOpen, 
  progress,
  step,
  funMessage
}: { 
  isOpen: boolean
  progress: number
  step: string
  funMessage: string
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">✨</div>
          <h3 className="text-2xl font-bold mb-2 text-gray-900">AI Sihiri Başlıyor...</h3>
          <p className="text-gray-600 mb-4">{step}</p>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <p className="text-sm text-purple-600 font-medium">{progress}% tamamlandı</p>
          
          {/* Fun Messages */}
          <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-gray-700 italic">💡 {funMessage}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function AddToCartModal({ 
  isOpen, 
  onClose,
  onAddToCart,
  onAddNewAngle,
  onStartFresh
}: { 
  isOpen: boolean
  onClose: () => void
  onAddToCart: () => void
  onAddNewAngle: () => void
  onStartFresh: () => void
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-2xl font-bold mb-4">🛒 Tasarım Tamamlandı!</h3>
        <p className="text-gray-600 mb-6">
          Bu Tişört'e Başka Açıdan Tasarım Eklemek İster Misiniz?
        </p>

        <div className="space-y-3">
          <button
            onClick={onAddToCart}
            className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
          >
            Hayır, Sepete Git 🛒
          </button>
          
          <button
            onClick={onAddNewAngle}
            className="w-full px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
          >
            Evet, Yeni Açı Ekle ➕
          </button>
          
          <button
            onClick={onStartFresh}
            className="w-full px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
          >
            Sıfırdan Yeni Tasarım Başlat 🆕
          </button>
        </div>
      </div>
    </div>
  )
}

// Draggable Element Component
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
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id })
  
  const style = {
    position: 'absolute' as const,
    left: element.position.x,
    top: element.position.y,
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    cursor: 'move',
  }

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

      if (element.type === 'image') {
        newWidth = Math.max(40, Math.min(50, newWidth))
        newHeight = Math.max(40, Math.min(50, newHeight))
      } else {
        newWidth = Math.max(10, Math.min(15, newWidth))
        newHeight = Math.max(10, Math.min(15, newHeight))
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
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onSelect}>
      <div className={`relative ${isSelected ? 'ring-2 ring-purple-500' : ''}`}>
        {element.type === 'image' && element.imageUrl && (
          <img
            src={element.imageUrl}
            alt="Design element"
            style={{
              width: element.imageWidth || 45,
              height: element.imageHeight || 45,
              objectFit: 'contain',
            }}
            draggable={false}
          />
        )}
        
        {element.type === 'text' && (
          <div
            style={{
              fontSize: `${element.fontSize || 12}px`,
              fontFamily: element.fontFamily || 'Arial',
              color: element.color || '#000000',
              fontWeight: element.fontWeight || 'normal',
              fontStyle: element.fontStyle || 'normal',
              whiteSpace: 'nowrap',
            }}
          >
            {element.text}
          </div>
        )}

        {isSelected && (
          <>
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-purple-500 rounded-full cursor-nw-resize" 
                 onMouseDown={(e) => handleResizeMouseDown(e, 'nw')} />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full cursor-ne-resize" 
                 onMouseDown={(e) => handleResizeMouseDown(e, 'ne')} />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-purple-500 rounded-full cursor-sw-resize" 
                 onMouseDown={(e) => handleResizeMouseDown(e, 'sw')} />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-purple-500 rounded-full cursor-se-resize" 
                 onMouseDown={(e) => handleResizeMouseDown(e, 'se')} />
          </>
        )}
      </div>
    </div>
  )
}

export default function CustomDesignEditor({ productImage, productName, onSave }: CustomDesignEditorProps) {
  // Product selection
  const [selectedProduct, setSelectedProduct] = useState<ProductType>('tshirt')
  const [selectedAngle, setSelectedAngle] = useState<ProductAngle>('front-chest')
  const [selectedColor, setSelectedColor] = useState<ProductColor>('white')
  const [selectedSize, setSelectedSize] = useState<ProductSize>('M')
  
  // Design state
  const [allAngleDesigns, setAllAngleDesigns] = useState<AngleDesign[]>([])
  const [currentElements, setCurrentElements] = useState<DesignElement[]>([])
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  
  // Modals
  const [showAIModal, setShowAIModal] = useState(false)
  const [showCartModal, setShowCartModal] = useState(false)
  const [showAIProcessing, setShowAIProcessing] = useState(false)
  const [aiProgress, setAiProgress] = useState(0)
  const [aiStep, setAiStep] = useState('')
  const [aiFunMessage, setAiFunMessage] = useState('')
  
  // UI state
  const [isUploading, setIsUploading] = useState(false)

  const productConfig = PRODUCT_CONFIGS[selectedProduct]
  const availableAngles = productConfig.angles
  const availableColors = productConfig.colors
  const availableSizes = productConfig.sizes ?? []

  // Get current mockup image
  const getMockupImage = () => {
    // Format: /mockups/{product}/{color}/{angle}.png
    const angleName = selectedAngle.replace(/-/g, '-') // Keep as-is
    return `${productConfig.mockupBaseUrl}/${selectedColor}/${angleName}.png`
  }

  // Handle AI image upload
  const handleAIImageUpload = async (instructions: string, file: File) => {
    setIsUploading(true)
    setShowAIProcessing(true)
    setAiProgress(0)
    
    // Fun messages to cycle through
    const funMessages = [
      "Piksel büyücüleri çalışıyor... ✨",
      "AI, resminizi inceliyor... 🔍",
      "Renkleri analiz ediyoruz... 🎨",
      "8-bit sihri uygulanıyor... 🎮",
      "Karakteriniz şekilleniyor... 👾",
      "Detaylar basitleştiriliyor... 🧙‍♂️",
      "Pixel art harikası yaratılıyor... 🎪",
      "Son rötuşlar yapılıyor... ✨"
    ]
    
    let messageIndex = 0
    setAiFunMessage(funMessages[0])

    // Progress simulation
    const progressInterval = setInterval(() => {
      setAiProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 15
      })
      messageIndex = (messageIndex + 1) % funMessages.length
      setAiFunMessage(funMessages[messageIndex])
    }, 800)

    try {
      setAiStep('📤 Görsel yükleniyor...')
      const formData = new FormData()
      formData.append('image', file)
      if (instructions) {
        formData.append('prompt', instructions)
      }

      setAiStep('🤖 AI analiz yapıyor...')
      setAiProgress(30)
      
      const response = await fetch('/api/ai/convert-image', {
        method: 'POST',
        body: formData,
      })

      setAiStep('🎨 Pixel art oluşturuluyor...')
      setAiProgress(60)

      const data = await response.json()

      setAiStep('✅ Tamamlanıyor...')
      setAiProgress(100)

      clearInterval(progressInterval)

      if (data.success && data.imageUrl) {
        const newElement: DesignElement = {
          id: `img-${Date.now()}`,
          type: 'image',
          position: { x: 200, y: 200 },
          imageUrl: data.imageUrl,
          imageWidth: 45,
          imageHeight: 45,
        }
        setCurrentElements([...currentElements, newElement])
        
        // Wait a moment to show 100% completion
        setTimeout(() => {
          setShowAIProcessing(false)
          toast.success(`Görsel eklendi! ${data.method ? `(${data.method})` : ''}`)
        }, 500)
      } else {
        clearInterval(progressInterval)
        setShowAIProcessing(false)
        toast.error(data.error || 'Görsel yüklenemedi')
      }
    } catch (error) {
      console.error('Upload error:', error)
      clearInterval(progressInterval)
      setShowAIProcessing(false)
      toast.error('Bir hata oluştu')
    } finally {
      setIsUploading(false)
    }
  }

  // Add text
  const handleAddText = () => {
    const newElement: DesignElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      position: { x: 200, y: 100 },
      text: 'Metin Ekle',
      fontSize: 12,
      fontFamily: 'Arial',
      color: '#000000',
      fontWeight: 'normal',
      fontStyle: 'normal',
    }
    setCurrentElements([...currentElements, newElement])
    setSelectedElement(newElement.id)
  }

  // Delete element
  const handleDeleteElement = () => {
    if (!selectedElement) return
    setCurrentElements(currentElements.filter(el => el.id !== selectedElement))
    setSelectedElement(null)
  }

  // Update element
  const handleUpdateElement = (id: string, updates: Partial<DesignElement>) => {
    setCurrentElements(currentElements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ))
  }

  // Drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event
    handleUpdateElement(active.id.toString(), {
      position: {
        x: (currentElements.find(el => el.id === active.id)?.position.x || 0) + delta.x,
        y: (currentElements.find(el => el.id === active.id)?.position.y || 0) + delta.y,
      },
    })
  }

  // Resize element
  const handleResize = (id: string, newWidth: number, newHeight: number) => {
    const element = currentElements.find(el => el.id === id)
    if (!element) return

    if (element.type === 'image') {
      handleUpdateElement(id, { imageWidth: newWidth, imageHeight: newHeight })
    } else {
      handleUpdateElement(id, { fontSize: newWidth })
    }
  }

  // Save current angle design
  const saveCurrentAngleDesign = () => {
    const existingIndex = allAngleDesigns.findIndex(d => d.angle === selectedAngle)
    const angleConfig = availableAngles.find(a => a.id === selectedAngle)
    const newDesign: AngleDesign = {
      angle: selectedAngle,
      angleName: angleConfig?.name || selectedAngle,
      elements: currentElements,
    }

    if (existingIndex >= 0) {
      const updated = [...allAngleDesigns]
      updated[existingIndex] = newDesign
      setAllAngleDesigns(updated)
    } else {
      setAllAngleDesigns([...allAngleDesigns, newDesign])
    }
  }

  // Handle "Sepete Ekle"
  const handleAddToCartClick = () => {
    if (currentElements.length === 0) {
      toast.error('Lütfen en az bir element ekleyin')
      return
    }
    saveCurrentAngleDesign()
    setShowCartModal(true)
  }

  const handleFinalAddToCart = () => {
    saveCurrentAngleDesign()
    onSave(allAngleDesigns)
    toast.success('Sepete eklendi!')
    setShowCartModal(false)
  }

  const handleAddNewAngle = () => {
    saveCurrentAngleDesign()
    setShowCartModal(false)
    setCurrentElements([])
    setSelectedElement(null)
    
    // Find next available angle
    const usedAngles = allAngleDesigns.map(d => d.angle)
    const nextAngle = availableAngles.find(a => !usedAngles.includes(a.id))
    if (nextAngle) {
      setSelectedAngle(nextAngle.id)
      toast.info(`Yeni açı: ${nextAngle.name}`)
    } else {
      toast.info('Tüm açılar kullanıldı')
    }
  }

  const handleStartFresh = () => {
    setShowCartModal(false)
    setAllAngleDesigns([])
    setCurrentElements([])
    setSelectedElement(null)
    setSelectedAngle('front-chest')
    toast.info('Yeni tasarım başlatıldı')
  }

  // Handle angle change
  const handleAngleChange = (angle: ProductAngle) => {
    // Save current before switching
    if (currentElements.length > 0) {
      saveCurrentAngleDesign()
    }

    // Load existing design for this angle
    const existing = allAngleDesigns.find(d => d.angle === angle)
    if (existing) {
      setCurrentElements(existing.elements)
    } else {
      setCurrentElements([])
    }
    setSelectedAngle(angle)
    setSelectedElement(null)
  }

  const selectedElementData = currentElements.find(el => el.id === selectedElement)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Panel - Product Options Only */}
      <div className="w-[420px] bg-white border-r border-gray-200 p-6 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Ürün Ayarları</h2>

        {/* Product Type Selection */}
        <div className="mb-6">
          <label className="block font-semibold mb-3 text-gray-900">Ürün Tipi</label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(PRODUCT_ICONS).map(([type, icon]) => {
              const config = PRODUCT_CONFIGS[type as ProductType]
              return (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedProduct(type as ProductType)
                    setSelectedAngle(config.angles[0].id)
                    setCurrentElements([])
                    setAllAngleDesigns([])
                  }}
                  className={`p-3 rounded-lg border-2 transition flex flex-col items-center ${
                    selectedProduct === type
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="text-3xl mb-1">{icon}</div>
                  <div className="text-xs font-medium text-gray-900">{config.name}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Angle Selection */}
        <div className="mb-6">
          <label className="block font-semibold mb-3 text-gray-900">Açı</label>
          <div className="grid grid-cols-2 gap-2">
            {availableAngles.map((angle) => {
              const isDesigned = allAngleDesigns.some(d => d.angle === angle.id)
              return (
                <button
                  key={angle.id}
                  onClick={() => handleAngleChange(angle.id)}
                  disabled={isDesigned && selectedAngle !== angle.id}
                  className={`p-3 rounded-lg border-2 transition relative ${
                    selectedAngle === angle.id
                      ? 'border-purple-500 bg-purple-50'
                      : isDesigned
                      ? 'border-green-300 bg-green-50 opacity-60'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{ANGLE_ICONS[angle.id] || '📍'}</div>
                  <div className="text-xs font-medium text-gray-900">{angle.name}</div>
                  {isDesigned && (
                    <div className="absolute top-1 right-1 text-green-600">✓</div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Color Selection */}
        <div className="mb-6">
          <label className="block font-semibold mb-3 text-gray-900">Renk</label>
          <div className="grid grid-cols-4 gap-2">
            {availableColors.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`p-3 rounded-lg border-2 transition ${
                  selectedColor === color
                    ? 'border-purple-500 ring-2 ring-purple-200'
                    : 'border-gray-200'
                }`}
                style={{ backgroundColor: COLOR_HEX[color] }}
                title={COLOR_LABELS[color]}
              >
                <div className="text-xs font-medium" style={{ 
                  color: ['black', 'navy'].includes(color) ? 'white' : 'black' 
                }}>
                  {COLOR_LABELS[color].substring(0, 3)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Size Selection */}
        {availableSizes.length > 0 && (
          <div className="mb-6">
            <label className="block font-semibold mb-3 text-gray-900">Beden</label>
            <div className="grid grid-cols-3 gap-2">
              {availableSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-4 py-2 rounded-lg border-2 transition text-gray-900 font-medium ${
                    selectedSize === size
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Center - Canvas */}
      <div className="flex-1 flex items-center justify-center p-4 bg-gray-100">
        <DndContext onDragEnd={handleDragEnd}>
          <div className="relative bg-white rounded-lg shadow-2xl overflow-hidden w-full max-w-4xl" style={{ aspectRatio: '1/1', maxHeight: 'calc(100vh - 120px)' }}>
            <img src={getMockupImage()} alt="Product" className="w-full h-full object-contain" />
            
            {currentElements.map((element) => (
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

      {/* Right Panel - Design Tools */}
      <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Tasarım Araçları</h2>

        {/* Action Buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => setShowAIModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <Upload size={20} />
            Görsel Yükle
          </button>

          <button
            onClick={handleAddText}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Type size={20} />
            Metin Ekle
          </button>

          {selectedElement && (
            <button
              onClick={handleDeleteElement}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              <Trash2 size={20} />
              Sil
            </button>
          )}
        </div>

        {/* Element List */}
        <div className="mb-6">
          <label className="block font-semibold mb-3 text-gray-900">Tasarım Öğeleri ({currentElements.length})</label>
          {currentElements.length === 0 ? (
            <p className="text-sm text-gray-500">Henüz öğe eklenmedi</p>
          ) : (
            <div className="space-y-2">
              {currentElements.map((el) => (
                <div
                  key={el.id}
                  onClick={() => setSelectedElement(el.id)}
                  className={`p-2 rounded border cursor-pointer transition ${
                    selectedElement === el.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900">
                    {el.type === 'image' ? '🖼️ Görsel' : '📝 Metin'}
                  </div>
                  {el.type === 'text' && (
                    <div className="text-xs text-gray-600 truncate">{el.text}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Element Editor */}
        {selectedElementData && selectedElementData.type === 'text' && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <label className="block font-semibold mb-2 text-gray-900">Metin Düzenle</label>
            <input
              type="text"
              value={selectedElementData.text || ''}
              onChange={(e) => handleUpdateElement(selectedElement!, { text: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded mb-3 text-gray-900"
            />
            
            <label className="block text-sm font-medium mb-1 text-gray-900">Font Tipi</label>
            <select
              value={selectedElementData.fontFamily || 'Arial'}
              onChange={(e) => handleUpdateElement(selectedElement!, { fontFamily: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded mb-3 text-gray-900"
            >
              <option value="Arial">Arial</option>
              <option value="'Times New Roman'">Times New Roman</option>
              <option value="'Courier New'">Courier New</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
              <option value="'Comic Sans MS'">Comic Sans MS</option>
              <option value="Impact">Impact</option>
              <option value="'Trebuchet MS'">Trebuchet MS</option>
            </select>
            
            <label className="block text-sm font-medium mb-1 text-gray-900">Boyut (Max 15px)</label>
            <input
              type="range"
              min="8"
              max="15"
              value={selectedElementData.fontSize || 12}
              onChange={(e) => handleUpdateElement(selectedElement!, { fontSize: parseInt(e.target.value) })}
              className="w-full mb-2"
            />
            <div className="text-sm text-gray-600">{selectedElementData.fontSize}px</div>
          </div>
        )}

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCartClick}
          disabled={currentElements.length === 0}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
        >
          <ShoppingCart size={24} />
          Sepete Ekle
        </button>
      </div>

      {/* Modals */}
      <AIInstructionsModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onConfirm={handleAIImageUpload}
      />

      <AIProcessingModal
        isOpen={showAIProcessing}
        progress={aiProgress}
        step={aiStep}
        funMessage={aiFunMessage}
      />

      <AddToCartModal
        isOpen={showCartModal}
        onClose={() => setShowCartModal(false)}
        onAddToCart={handleFinalAddToCart}
        onAddNewAngle={handleAddNewAngle}
        onStartFresh={handleStartFresh}
      />
    </div>
  )
}
