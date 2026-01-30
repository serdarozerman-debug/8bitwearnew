'use client'

import { useState, useRef } from 'react'
import { DndContext, DragEndEvent, useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { HexColorPicker } from 'react-colorful'
import html2canvas from 'html2canvas'
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

// For cart items with multi-angle support
interface CartAngleDesign {
  angle: ProductAngle
  angleName: string
  elements: DesignElement[]
  designPreview: string // screenshot
}

interface CustomDesignEditorProps {
  productImage: string
  productName: string
  productColor?: string
  onSave: (design: AngleDesign[]) => void
}

// Product type icons (using images)
const PRODUCT_ICONS: Record<ProductType, string> = {
  tshirt: '/icons/Tişört icon.png',
  sweatshirt: '/icons/Sweatshirt icon.png',
  hat: '/icons/Şapka icon.png',
  bag: '/icons/Çanta icon.avif',
  keychain: '/icons/Anahtarlık icon.png'
}

// Angle icons (using images)
const ANGLE_ICONS: Record<string, string> = {
  'front-chest': '/icons/Ön Taraf.jpg',
  'right-sleeve': '/icons/Sağ Kol.png',
  'left-sleeve': '/icons/Sol Kol.jpg',
  'back': '/icons/Arka Taraf icon.png',
  'front-forehead': '/icons/Ön Taraf.jpg',
  'right-side': '/icons/Sağ Kol.png',
  'left-side': '/icons/Sol Kol.jpg',
  'front-face': '/icons/Ön Taraf.jpg',
  'side-pocket': '/icons/Çanta icon.avif',
  'flat-white': '/icons/Anahtarlık icon.png'
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
  
  const style: React.CSSProperties = {
    position: 'absolute' as const,
    left: element.position.x,
    top: element.position.y,
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    cursor: 'move',
    touchAction: 'none', // Prevent native touch behaviors (scroll, zoom, context menu)
    WebkitTouchCallout: 'none' as any, // Prevent iOS context menu (long press)
    WebkitUserSelect: 'none' as any, // Prevent text selection
    userSelect: 'none', // Prevent text selection
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
              pointerEvents: 'none', // Prevent image from capturing events
              WebkitTouchCallout: 'none', // Prevent iOS context menu
              WebkitUserSelect: 'none',
              userSelect: 'none',
            }}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()} // Prevent right-click menu
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
  
  // Multi-angle cart system
  const [savedAnglesForCart, setSavedAnglesForCart] = useState<CartAngleDesign[]>([])
  const [isMultiAngleMode, setIsMultiAngleMode] = useState(false) // After first "Add to Cart"
  const [lockedProduct, setLockedProduct] = useState<ProductType | null>(null)
  const [lockedColor, setLockedColor] = useState<ProductColor | null>(null)
  
  // Modals
  const [showAIModal, setShowAIModal] = useState(false)
  const [showAIProcessing, setShowAIProcessing] = useState(false)
  const [aiProgress, setAiProgress] = useState(0)
  const [aiStep, setAiStep] = useState('')
  const [aiFunMessage, setAiFunMessage] = useState('')
  
  // Ref for mockup screenshot
  const mockupContainerRef = useRef<HTMLDivElement>(null)
  
  // UI state
  const [isUploading, setIsUploading] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1.4) // Default 140% zoom for better visibility

  const productConfig = PRODUCT_CONFIGS[selectedProduct]
  const availableAngles = productConfig.angles
  const availableColors = productConfig.colors
  const availableSizes = productConfig.sizes ?? []

  // Get current mockup image
  const getMockupImage = () => {
    // Use standard mockups with English names (compatible with all systems)
    const angleName = selectedAngle
    const mockupUrl = `${productConfig.mockupBaseUrl}/${selectedColor}/${angleName}.png`
    console.log('[Mockup Debug]', { 
      productType: selectedProduct,
      color: selectedColor, 
      angle: selectedAngle,
      baseUrl: productConfig.mockupBaseUrl,
      fullUrl: mockupUrl 
    })
    return mockupUrl
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
        // Increment by 5-15% rounded to whole numbers
        const increment = Math.floor(Math.random() * 11) + 5 // 5-15
        return Math.min(90, prev + increment)
      })
      messageIndex = (messageIndex + 1) % funMessages.length
      setAiFunMessage(funMessages[messageIndex])
    }, 800)

    try {
      setAiStep('📤 Görsel yükleniyor...')
      
      // Convert File to base64 data URL
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      
      const imageDataUrl = await base64Promise
      setAiProgress(20)

      setAiStep('🤖 AI analiz yapıyor...')
      setAiProgress(30)
      
      const response = await fetch('/api/ai/convert-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: imageDataUrl,
          prompt: instructions || 'Pixel art character sprite',
        }),
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
  const handleAddToCartClick = async () => {
    if (currentElements.length === 0) {
      toast.error('Lütfen en az bir element ekleyin')
      return
    }
    saveCurrentAngleDesign()
    
    // Capture screenshot for this angle
    let designPreview = getMockupImage()
    
    try {
      if (mockupContainerRef.current) {
        const canvas = await html2canvas(mockupContainerRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
          useCORS: true
        })
        designPreview = canvas.toDataURL('image/png')
      }
    } catch (error) {
      console.error('[Screenshot] Failed to capture:', error)
    }
    
    // Get angle name
    const angleName = availableAngles.find(a => a.id === selectedAngle)?.name || selectedAngle
    
    // Add current angle to saved angles
    const newAngle: CartAngleDesign = {
      angle: selectedAngle,
      angleName: angleName,
      elements: [...currentElements],
      designPreview: designPreview
    }
    
    // Check if this angle already exists (update it)
    const existingIndex = savedAnglesForCart.findIndex(a => a.angle === selectedAngle)
    let updatedAngles: CartAngleDesign[]
    
    if (existingIndex >= 0) {
      // Update existing angle
      updatedAngles = [...savedAnglesForCart]
      updatedAngles[existingIndex] = newAngle
      toast.success(`${angleName} güncellendi!`)
    } else {
      // Add new angle
      if (savedAnglesForCart.length >= 4) {
        toast.error('Maksimum 4 açı ekleyebilirsiniz')
        return
      }
      updatedAngles = [...savedAnglesForCart, newAngle]
      toast.success(`${angleName} eklendi!`)
    }
    
    setSavedAnglesForCart(updatedAngles)
    
    // Enter multi-angle mode and lock product/color
    if (!isMultiAngleMode) {
      setIsMultiAngleMode(true)
      setLockedProduct(selectedProduct)
      setLockedColor(selectedColor)
      toast.info('Başka açı eklemek isterseniz açı seçin, yoksa "Sepete Ekle" yapın')
    }
    
    // Clear current elements for next angle
    setCurrentElements([])
    setSelectedElement(null)
  }
  
  const handleRemoveAngleFromCart = (angle: ProductAngle) => {
    const updated = savedAnglesForCart.filter(a => a.angle !== angle)
    setSavedAnglesForCart(updated)
    
    const angleName = availableAngles.find(a => a.id === angle)?.name || angle
    toast.success(`${angleName} silindi`)
    
    // If no more angles, exit multi-angle mode
    if (updated.length === 0) {
      setIsMultiAngleMode(false)
      setLockedProduct(null)
      setLockedColor(null)
    }
  }

  const handleFinalAddToCart = async () => {
    // If there's a current design not yet saved, save it first
    if (currentElements.length > 0 && !savedAnglesForCart.some(a => a.angle === selectedAngle)) {
      await handleAddToCartClick() // This will save current angle
    }
    
    if (savedAnglesForCart.length === 0 && currentElements.length === 0) {
      toast.error('En az bir açı için tasarım eklemelisiniz')
      return
    }
    
    // Use savedAnglesForCart (just updated if needed)
    const anglesToSave = savedAnglesForCart.length > 0 ? savedAnglesForCart : []
    
    if (anglesToSave.length === 0) {
      toast.error('Lütfen önce "Açı Ekle" yapın')
      return
    }
    
    // Extract pixel art URL from first angle's first image element
    const firstAngle = anglesToSave[0]
    const pixelArtElement = firstAngle.elements.find(el => el.type === 'image' && el.imageUrl)
    const pixelArtUrl = pixelArtElement?.imageUrl || null
    
    console.log('[Cart] Pixel art URL for 3D conversion:', pixelArtUrl)
    
    // Save to localStorage cart
    try {
      const cartItem = {
        id: `custom-${Date.now()}`,
        productName: `${PRODUCT_CONFIGS[selectedProduct].name} (Özel Tasarım)`,
        productImage: anglesToSave[0].designPreview, // First angle's preview
        color: COLOR_LABELS[selectedColor as ProductColor] || selectedColor,
        size: selectedSize,
        quantity: 1,
        price: 299.99 + (anglesToSave.length - 1) * 50, // +50 TL per additional angle
        designPreview: anglesToSave[0].designPreview,
        pixelArtUrl: pixelArtUrl,
        multiAngleDesigns: anglesToSave, // All angles with their designs
        customDesign: anglesToSave.map(a => ({
          angle: a.angle,
          angleName: a.angleName,
          elements: a.elements
        }))
      }
      
      const existingCart = localStorage.getItem('cart')
      const cart = existingCart ? JSON.parse(existingCart) : []
      cart.push(cartItem)
      localStorage.setItem('cart', JSON.stringify(cart))
      
      toast.success('Sepete eklendi!')
      
      // Reset for new product
      setSavedAnglesForCart([])
      setIsMultiAngleMode(false)
      setLockedProduct(null)
      setLockedColor(null)
      setCurrentElements([])
      setAllAngleDesigns([])
      setSelectedElement(null)
      
      // Navigate to cart
      setTimeout(() => {
        window.location.href = '/cart'
      }, 500)
    } catch (error) {
      console.error('Failed to add to cart:', error)
      toast.error('Sepete eklenirken hata oluştu')
    }
  }

  const handleStartFresh = () => {
    setSavedAnglesForCart([])
    setIsMultiAngleMode(false)
    setLockedProduct(null)
    setLockedColor(null)
    setAllAngleDesigns([])
    setCurrentElements([])
    setSelectedElement(null)
    setSelectedAngle('front-chest')
    toast.info('Yeni tasarım başlatıldı')
  }

  // Handle angle change
  const handleAngleChange = (angle: ProductAngle) => {
    // Check if this angle is already saved (locked)
    const isSavedAngle = savedAnglesForCart.some(a => a.angle === angle)
    
    if (isSavedAngle) {
      const angleName = availableAngles.find(a => a.id === angle)?.name || angle
      toast.error(`${angleName} zaten kaydedildi! Değiştirmek için önce silin.`)
      return
    }
    
    // Save current before switching
    if (currentElements.length > 0) {
      saveCurrentAngleDesign()
    }

    // Start fresh for new angle (don't copy elements)
    setCurrentElements([])
    setSelectedAngle(angle)
    setSelectedElement(null)
  }

  const selectedElementData = currentElements.find(el => el.id === selectedElement)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row overflow-x-hidden relative">
      {/* Scroll Indicator - Mobile Only */}
      <div className="lg:hidden fixed bottom-20 right-4 z-50 flex flex-col gap-2">
        <div className="w-1 h-16 bg-gray-300 rounded-full overflow-hidden">
          <div 
            className="w-full bg-purple-500 rounded-full transition-all"
            style={{ 
              height: '30%',
              transform: 'translateY(0%)'
            }}
          />
        </div>
      </div>

      {/* Left Panel - Product Options Only */}
      <div className="w-full lg:w-[420px] bg-white border-b lg:border-b-0 lg:border-r border-gray-200 p-4 lg:p-6 overflow-y-auto max-h-[calc(50vh+60px)] lg:max-h-screen">
        {/* Product Type Selection */}
        <div className="mb-3 lg:mb-6">
          <label className="hidden lg:block font-semibold mb-3 text-gray-900 text-base">Ürün Tipi {isMultiAngleMode && '🔒'}</label>
          {/* Horizontal Scroll Slider - Mobile & Desktop */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {Object.entries(PRODUCT_ICONS).map(([type, icon]) => {
              const config = PRODUCT_CONFIGS[type as ProductType]
              const isLocked = isMultiAngleMode && lockedProduct !== type
              return (
                <button
                  key={type}
                  onClick={() => {
                    if (isLocked) {
                      toast.error('Ürün tipi kilitli! Önce mevcut tasarımı tamamlayın.')
                      return
                    }
                    setSelectedProduct(type as ProductType)
                    setSelectedAngle(config.angles[0].id)
                    setCurrentElements([])
                    setAllAngleDesigns([])
                  }}
                  disabled={isLocked}
                  className={`p-2 lg:p-3 rounded-lg border-2 transition flex flex-col items-center min-w-[70px] lg:min-w-0 flex-shrink-0 ${
                    selectedProduct === type
                      ? 'border-purple-500 bg-purple-50'
                      : isLocked
                      ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <img src={icon} alt={config.name} className="w-8 h-8 lg:w-12 lg:h-12 object-contain mb-1" />
                  <div className="text-[10px] lg:text-xs font-medium text-gray-900 text-center leading-tight">{config.name}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Angle Selection */}
        <div className="mb-3 lg:mb-6">
          <label className="hidden lg:block font-semibold mb-3 text-gray-900 text-base">Açı</label>
          {/* Horizontal Scroll Slider - Mobile & Desktop */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {availableAngles.map((angle) => {
              const isSaved = savedAnglesForCart.some(a => a.angle === angle.id)
              const isDesigned = allAngleDesigns.some(d => d.angle === angle.id)
              return (
                <button
                  key={angle.id}
                  onClick={() => handleAngleChange(angle.id)}
                  disabled={selectedAngle === angle.id}
                  className={`p-2 lg:p-3 rounded-lg border-2 transition relative min-w-[70px] lg:min-w-0 flex-shrink-0 flex flex-col items-center ${
                    selectedAngle === angle.id
                      ? 'border-purple-500 bg-purple-50'
                      : isSaved
                      ? 'border-green-500 bg-green-100 cursor-pointer'
                      : isDesigned
                      ? 'border-green-300 bg-green-50 hover:border-green-500 cursor-pointer'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <img 
                    src={ANGLE_ICONS[angle.id] || '/icons/Ön Taraf.jpg'} 
                    alt={angle.name} 
                    className="w-6 h-6 lg:w-10 lg:h-10 object-contain mb-1 mx-auto" 
                  />
                  <div className="text-[10px] lg:text-xs font-medium text-gray-900 text-center leading-tight">{angle.name}</div>
                  {isSaved && (
                    <div className="absolute top-1 right-1 text-green-600 text-sm lg:text-base font-bold">🔒</div>
                  )}
                  {!isSaved && isDesigned && (
                    <div className="absolute top-1 right-1 text-green-600 text-xs lg:text-sm">✓</div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Color Selection */}
        <div className="mb-3 lg:mb-6">
          <label className="hidden lg:block font-semibold mb-3 text-gray-900 text-base">Renk {isMultiAngleMode && '🔒'}</label>
          {/* Horizontal Scroll Slider - Mobile & Desktop */}
          <div className="flex gap-3 overflow-x-auto py-2 -mx-1 px-1 scrollbar-hide">
            {availableColors.map((color) => {
              const isLocked = isMultiAngleMode && lockedColor !== color
              return (
                <button
                  key={color}
                  onClick={() => {
                    if (isLocked) {
                      toast.error('Renk kilitli! Önce mevcut tasarımı tamamlayın.')
                      return
                    }
                    // Save current elements before color change
                    if (currentElements.length > 0) {
                      saveCurrentAngleDesign()
                    }
                    setSelectedColor(color)
                  }}
                  disabled={isLocked}
                  className={`flex-shrink-0 rounded-full transition relative ${
                    selectedColor === color
                      ? 'ring-4 ring-purple-400'
                      : isLocked
                      ? 'ring-2 ring-gray-200 opacity-40 cursor-not-allowed'
                      : 'ring-2 ring-gray-200 hover:ring-gray-300'
                  }`}
                  style={{ backgroundColor: COLOR_HEX[color] }}
                  title={COLOR_LABELS[color]}
                >
                  {/* Always Circle */}
                  <div className="w-12 h-12 lg:w-12 lg:h-12 rounded-full" />
                  {selectedColor === color && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-xl drop-shadow-lg">✓</span>
                    </div>
                  )}
                  {isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-gray-600 text-xl">🔒</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Size Selection */}
        {availableSizes.length > 0 && (
          <div className="mb-3 lg:mb-6">
            <label className="hidden lg:block font-semibold mb-3 text-gray-900 text-base">Beden</label>
            {/* Horizontal Scroll Slider - Mobile & Desktop */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              {availableSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg border-2 transition text-gray-900 font-medium text-sm lg:text-base min-w-[60px] lg:min-w-0 flex-shrink-0 ${
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

        {/* Quick Action Buttons - Mobile & Desktop: Bottom of Left Panel */}
        <div className="space-y-2 mt-6 pt-6 border-t border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => setShowAIModal(true)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 lg:px-4 lg:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm lg:text-base font-medium"
            >
              <Upload size={18} className="lg:w-5 lg:h-5" />
              Görsel Yükle
            </button>

            <button
              onClick={handleAddText}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 lg:px-4 lg:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm lg:text-base font-medium"
            >
              <Type size={18} className="lg:w-5 lg:h-5" />
              Metin Ekle
            </button>
          </div>

          {selectedElement && (
            <button
              onClick={handleDeleteElement}
              className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm lg:text-base font-medium"
            >
              <Trash2 size={18} className="lg:w-5 lg:h-5" />
              Seçili Öğeyi Sil
            </button>
          )}
        </div>
      </div>

      {/* Center - Canvas */}
      <div className="flex-1 flex flex-col bg-gray-100 min-h-[50vh]">
        {/* Zoom Controls - Desktop Only */}
        <div className="hidden lg:flex items-center justify-center gap-2 py-2 bg-white border-b">
          <button
            onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium text-gray-900"
          >
            −
          </button>
          <span className="text-sm font-medium min-w-[60px] text-center text-gray-900">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium text-gray-900"
          >
            +
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium ml-2 text-gray-900"
          >
            Reset
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex items-start justify-center overflow-auto p-4" style={{ touchAction: 'pan-y pinch-zoom' }}>
          <div className="flex items-start justify-center min-h-full">
            <DndContext onDragEnd={handleDragEnd}>
              {/* Fixed-size viewer container - handles zoom */}
              <div 
                ref={mockupContainerRef}
                className="relative bg-white shadow-2xl" 
                style={{ 
                  width: '600px',
                  height: '600px',
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.2s ease',
                  flexShrink: 0,
                  touchAction: 'none',
                }}
              >
                {/* Inner shirt-frame - normalizes all images */}
                <div 
                  className="absolute inset-0"
                  style={{
                    padding: '5px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                >
                  <img 
                    src={getMockupImage()} 
                    alt="Product" 
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      objectPosition: 'center 45%',
                      transformOrigin: 'center top'
                    }}
                    onLoad={(e) => {
                      const imgElement = e.target as HTMLImageElement
                      console.log('[Mockup] Image loaded successfully:', imgElement.src, imgElement.naturalWidth, 'x', imgElement.naturalHeight)
                    }}
                    onError={(e) => {
                      const imgElement = e.target as HTMLImageElement
                      console.error('[Mockup ERROR] Failed to load image:', imgElement.src)
                    }}
                  />
                </div>
                
                {/* Design elements overlay */}
                <div className="absolute inset-0" style={{ pointerEvents: 'auto' }}>
                  {currentElements.map((element) => (
                    <div key={element.id} style={{ pointerEvents: 'auto' }}>
                      <DraggableElement
                        id={element.id}
                        element={element}
                        isSelected={selectedElement === element.id}
                        onSelect={() => setSelectedElement(element.id)}
                        onResize={handleResize}
                      />
                    </div>
                  ))}
                </div>

                {/* Floating Add to Cart Button - Top Center - Mobile Only */}
                <button
                  onClick={handleAddToCartClick}
                  disabled={currentElements.length === 0}
                  className="lg:hidden absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-full hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm shadow-lg z-10"
                  style={{ pointerEvents: 'auto' }}
                >
                  <Plus size={20} />
                  {savedAnglesForCart.length === 0 ? 'Açı Ekle' : 'Başka Açı Ekle'}
                </button>
              </div>
            </DndContext>
          </div>
        </div>

        {/* Action Buttons - Below Canvas - Mobile Only */}
        <div className="lg:hidden bg-white border-t border-gray-200 p-3 space-y-2">
          {savedAnglesForCart.length === 0 ? (
            <>
              <button
                onClick={handleAddToCartClick}
                disabled={currentElements.length === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-bold text-base"
              >
                <Plus size={24} />
                Açı Ekle
              </button>
              <button
                onClick={handleFinalAddToCart}
                disabled={currentElements.length === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-bold text-base shadow-md"
              >
                <ShoppingCart size={24} />
                Sepete Ekle
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleFinalAddToCart}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-bold text-base shadow-md"
              >
                <ShoppingCart size={24} />
                Sepete Ekle ({savedAnglesForCart.length} Açı)
              </button>
              {savedAnglesForCart.length < 4 && (
                <button
                  onClick={handleAddToCartClick}
                  disabled={currentElements.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <Plus size={20} />
                  Başka Açı Ekle
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Panel - Saved Angles & Cart Summary */}
      <div className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 p-4 lg:p-6 overflow-y-auto max-h-screen">
        {/* Current Design Preview - Desktop Only */}
        <div className="hidden lg:block mb-4">
          <label className="block font-semibold mb-3 text-gray-900">Şu Anki Açı</label>
          <div className="text-sm text-gray-600 mb-2">
            {availableAngles.find(a => a.id === selectedAngle)?.name || selectedAngle}
          </div>
          <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center" style={{ aspectRatio: '1', maxHeight: '180px' }}>
            {currentElements.length > 0 ? (
              <div 
                className="relative w-full h-full"
                style={{ 
                  backgroundImage: `url(${getMockupImage()})`,
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                {currentElements.map((el) => (
                  <div
                    key={el.id}
                    style={{
                      position: 'absolute',
                      left: el.position.x,
                      top: el.position.y,
                      transform: 'scale(0.25)',
                      transformOrigin: 'top left',
                      pointerEvents: 'none'
                    }}
                  >
                    {el.type === 'image' ? (
                      <img 
                        src={el.imageUrl} 
                        alt="Design element" 
                        style={{ 
                          width: el.imageWidth || 128,
                          height: el.imageHeight || 128,
                          objectFit: 'contain'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          fontFamily: el.fontFamily || 'Arial',
                          fontSize: `${el.fontSize || 24}px`,
                          color: el.color || '#000000',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {el.text}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Tasarım eklenmedi</p>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {currentElements.filter(el => el.type === 'image').length} görsel, {currentElements.filter(el => el.type === 'text').length} metin
          </div>
        </div>

        {/* Saved Angles List - Desktop Only */}
        {savedAnglesForCart.length > 0 && (
          <div className="hidden lg:block mb-4">
            <label className="block font-semibold mb-3 text-gray-900">
              Eklenen Açılar ({savedAnglesForCart.length}/4)
            </label>
            <div className="space-y-2">
              {savedAnglesForCart.map((angleDesign) => (
                <div
                  key={angleDesign.angle}
                  className="p-3 border-2 border-green-200 bg-green-50 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-sm text-gray-900">{angleDesign.angleName}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {angleDesign.elements.filter(el => el.type === 'image').length} görsel, {angleDesign.elements.filter(el => el.type === 'text').length} metin
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAngleFromCart(angleDesign.angle)}
                      className="text-red-600 hover:text-red-700 p-1"
                      title="Bu açıyı sil"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-1 mt-2">
                    {angleDesign.elements.slice(0, 5).map((el, idx) => (
                      <div key={idx} className="text-xs bg-white rounded px-1 py-0.5 text-center truncate">
                        {el.type === 'image' ? '🖼️' : '📝'}
                      </div>
                    ))}
                    {angleDesign.elements.length > 5 && (
                      <div className="text-xs bg-white rounded px-1 py-0.5 text-center">
                        +{angleDesign.elements.length - 5}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {savedAnglesForCart.length < 4 && (
              <p className="text-xs text-gray-500 mt-2">
                {4 - savedAnglesForCart.length} açı daha ekleyebilirsiniz
              </p>
            )}
          </div>
        )}

        {/* Product Lock Info */}
        {isMultiAngleMode && (
          <div className="hidden lg:block mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-xs font-semibold text-blue-900 mb-1">🔒 Ürün Kilitlendi</div>
            <div className="text-xs text-blue-700">
              <div>Ürün: {PRODUCT_CONFIGS[selectedProduct].name}</div>
              <div>Renk: {COLOR_LABELS[selectedColor]}</div>
              <div className="mt-1 text-blue-600">Başka açılar için tasarım ekleyebilirsiniz</div>
            </div>
          </div>
        )}

        {/* Action Buttons - Desktop Only */}
        <div className="hidden lg:block space-y-3">
          {/* If no saved angles yet - show both buttons */}
          {savedAnglesForCart.length === 0 && (
            <>
              <button
                onClick={handleAddToCartClick}
                disabled={currentElements.length === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
              >
                <Plus size={24} />
                Açı Ekle
              </button>
              <button
                onClick={handleFinalAddToCart}
                disabled={currentElements.length === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
              >
                <ShoppingCart size={24} />
                Sepete Ekle
              </button>
            </>
          )}
          
          {/* If angles saved - show final cart and optional add more */}
          {savedAnglesForCart.length > 0 && (
            <>
              <button
                onClick={handleFinalAddToCart}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-bold text-lg"
              >
                <ShoppingCart size={24} />
                Sepete Ekle ({savedAnglesForCart.length} Açı)
              </button>
              {savedAnglesForCart.length < 4 && (
                <button
                  onClick={handleAddToCartClick}
                  disabled={currentElements.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <Plus size={20} />
                  Başka Açı Ekle
                </button>
              )}
            </>
          )}
        </div>
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
    </div>
  )
}
