import React, { useState } from 'react';
import { ShoppingBag, Loader2, ArrowRight, Search, Tag, Box } from 'lucide-react';
import { useShop } from '../hooks/useShop';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';

const ShopSection: React.FC = () => {
    const { products, categories, loading, error } = useShop();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProducts = products.filter(p => {
        const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.brand?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <section id="tienda" className="py-24 px-4 bg-zinc-950/50 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-red-600/5 rounded-full blur-[100px] -z-10" />

            <div className="container mx-auto max-w-7xl">
                <div className="text-center mb-16">
                    <Badge variant="warning" className="mb-4 px-4 py-1.5 text-[10px] tracking-[0.3em]">RECAMBIOS Y ACCESORIOS</Badge>
                    <h2 className="text-5xl md:text-7xl font-bold heading-racing text-white mb-4 italic tracking-tighter">
                        SHOP <span className="text-amber-500 text-glow-amber">MOTOCADENA</span>
                    </h2>
                    <p className="text-neutral-400 max-w-2xl mx-auto text-lg leading-relaxed font-bold">
                        Venta de repuestos originales y de alto desempeño para que tu moto nunca se detenga.
                    </p>
                </div>

                {/* Filters and Search */}
                <div className="flex flex-col lg:flex-row gap-6 mb-12 items-center justify-between">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button
                            variant={selectedCategory === null ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedCategory(null)}
                            className="text-[10px] font-black tracking-widest uppercase h-9"
                        >
                            TODOS
                        </Button>
                        {categories.map(cat => (
                            <Button
                                key={cat.id}
                                variant={selectedCategory === cat.id ? 'primary' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedCategory(cat.id)}
                                className="text-[10px] font-black tracking-widest uppercase h-9"
                            >
                                {cat.name}
                            </Button>
                        ))}
                    </div>

                    <div className="relative w-full lg:w-80 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4 group-focus-within:text-amber-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar productos..."
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <Loader2 className="w-16 h-16 text-amber-500 animate-spin mb-6" />
                        <p className="text-zinc-500 italic uppercase tracking-widest font-black text-xs animate-pulse">Sincronizando Inventario de Pista...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-20 bg-red-500/5 rounded-[2rem] border border-red-500/10">
                        <p className="text-red-500 font-bold mb-4">{error}</p>
                        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Reintentar</Button>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-24 bg-zinc-900/30 rounded-[3.5rem] border border-zinc-800 border-dashed">
                        <Box className="w-16 h-16 text-zinc-700 mx-auto mb-6 opacity-50" />
                        <h3 className="text-xl font-black text-zinc-500 heading-racing italic tracking-tighter">SIN RESULTADOS EN BOXES</h3>
                        <p className="text-zinc-600 font-medium">No encontramos productos que coincidan con tu búsqueda.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {filteredProducts.map((product) => (
                            <Card key={product.id} className="group hover:border-amber-500/50 transition-all flex flex-col h-full bg-zinc-900/40 backdrop-blur-sm border-zinc-800 overflow-hidden rounded-[2.5rem]">
                                <div className="aspect-square relative overflow-hidden bg-zinc-950">
                                    {(product as any).product_images && (product as any).product_images.length > 0 ? (
                                        <img
                                            src={(product as any).product_images[0].url}
                                            alt={product.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-800 bg-zinc-950">
                                            <ShoppingBag size={48} className="mb-2 opacity-20" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">SIN IMAGEN</span>
                                        </div>
                                    )}
                                    {product.is_featured && (
                                        <div className="absolute top-4 left-4">
                                            <span className="bg-amber-500 text-black text-[9px] font-black uppercase px-3 py-1 rounded-full shadow-lg shadow-amber-500/20 tracking-widest">
                                                FEATURED
                                            </span>
                                        </div>
                                    )}
                                    {product.brand && (
                                        <div className="absolute bottom-4 left-4">
                                            <span className="bg-black/80 backdrop-blur-md text-zinc-300 text-[9px] font-black uppercase px-3 py-1 rounded-full border border-zinc-800 tracking-widest">
                                                {product.brand}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-8 flex flex-col flex-grow">
                                    <div className="mb-4">
                                        <h3 className="text-zinc-100 font-bold text-lg mb-1 group-hover:text-amber-500 transition-colors line-clamp-2 uppercase italic leading-tight">
                                            {product.name}
                                        </h3>
                                        <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">SKU: {product.sku}</p>
                                    </div>

                                    {product.description && (
                                        <p className="text-zinc-400 text-xs line-clamp-2 mb-6 font-medium italic">
                                            {product.description}
                                        </p>
                                    )}

                                    <div className="mt-auto flex items-end justify-between">
                                        <div>
                                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">PRECIO BASE</p>
                                            <p className="text-3xl font-black text-white heading-racing italic text-glow-amber transition-all group-hover:scale-110 origin-left">
                                                ${Number(product.unit_price).toFixed(2)}
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-10 h-10 p-0 rounded-full border-zinc-800 hover:border-amber-500 hover:bg-amber-500 text-zinc-400 hover:text-black transition-all group/btn"
                                            onClick={() => window.open(`https://wa.me/584147131270?text=Hola%20Motocadena,%20me%20interesa%20el%20producto%20${product.name}%20(SKU:%20${product.sku})`, '_blank')}
                                        >
                                            <ArrowRight size={16} className="group-hover/btn:translate-x-0.5 transition-transform" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                <div className="mt-20 pt-12 border-t border-zinc-900 text-center">
                    <p className="text-zinc-500 text-sm italic font-medium mb-8">
                        ¿Buscas algo específico? Consultanos directamente por repuestos bajo pedido.
                    </p>
                    <Button
                        size="lg"
                        variant="outline"
                        className="h-16 px-12 heading-racing text-2xl italic gap-4 border-zinc-800 hover:border-amber-500 group"
                        onClick={() => window.open('https://wa.me/584147131270?text=Hola%20Motocadena,%20busco%20un%20repuesto%20especifico', '_blank')}
                    >
                        CONSULTA DISPONIBILIDAD <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </div>
        </section>
    );
};

export default ShopSection;
