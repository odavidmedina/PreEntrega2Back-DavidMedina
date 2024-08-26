const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const cartsFilePath = path.join(__dirname, '../data/carts.json');
const productsFilePath = path.join(__dirname, '../data/products.json');

const getCarts = async () => JSON.parse(await fs.readFile(cartsFilePath, 'utf8'));
const saveCarts = async (carts) => await fs.writeFile(cartsFilePath, JSON.stringify(carts, null, 2));
const getProducts = async () => JSON.parse(await fs.readFile(productsFilePath, 'utf8'));

const generateId = (items) => {
    const ids = items.map(item => item.id);
    return ids.length ? Math.max(...ids) + 1 : 1;
};

// Obtener todos los carritos
router.get('/', async (req, res) => {
    try {
        const carts = await getCarts();
        res.json(carts);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching carts' });
    }
});

// Obtener un carrito por ID
router.get('/:id', async (req, res) => {
    try {
        const carts = await getCarts();
        const cart = carts.find(c => c.id === parseInt(req.params.id, 10));
        if (cart) {
            res.json(cart);
        } else {
            res.status(404).json({ error: 'Cart not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error fetching cart' });
    }
});

// Crear un nuevo carrito
router.post('/', async (req, res) => {
    try {
        const carts = await getCarts();
        const newCart = {
            id: generateId(carts),
            products: []
        };
        carts.push(newCart);
        await saveCarts(carts);
        res.status(201).json(newCart);
    } catch (error) {
        res.status(500).json({ error: 'Error creating cart' });
    }
});

// Agregar un producto al carrito
router.post('/:id/products', async (req, res) => {
    try {
        const carts = await getCarts();
        const products = await getProducts();
        const cart = carts.find(c => c.id === parseInt(req.params.id, 10));
        const product = products.find(p => p.id === req.body.productId);

        if (!cart || !product) {
            return res.status(404).json({ error: 'Cart or product not found' });
        }

        const existingProduct = cart.products.find(p => p.product === req.body.productId);
        if (existingProduct) {
            existingProduct.quantity += 1;
        } else {
            cart.products.push({ product: req.body.productId, quantity: 1 });
        }

        await saveCarts(carts);
        res.status(200).json(cart);
    } catch (error) {
        res.status(500).json({ error: 'Error adding product to cart' });
    }
});

// Eliminar un producto del carrito
router.delete('/:id/products/:productId', async (req, res) => {
    try {
        const carts = await getCarts();
        const cart = carts.find(c => c.id === parseInt(req.params.id, 10));
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        cart.products = cart.products.filter(p => p.product !== parseInt(req.params.productId, 10));
        await saveCarts(carts);
        res.status(200).json(cart);
    } catch (error) {
        res.status(500).json({ error: 'Error removing product from cart' });
    }
});

module.exports = router;
