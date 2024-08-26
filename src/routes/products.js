const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();
const productsFilePath = path.join(__dirname, '../data/products.json');

// Obtener todos los productos
router.get('/', async (req, res) => {
    try {
        const products = JSON.parse(await fs.readFile(productsFilePath, 'utf8'));
        res.json(products);
    } catch (error) {
        res.status(500).send('Error reading products data');
    }
});

// Crear un nuevo producto
router.post('/', async (req, res) => {
    try {
        const products = JSON.parse(await fs.readFile(productsFilePath, 'utf8'));
        const newProduct = {
            id: products.length ? Math.max(...products.map(p => p.id)) + 1 : 1,
            ...req.body
        };
        products.push(newProduct);
        await fs.writeFile(productsFilePath, JSON.stringify(products, null, 2));
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).send('Error adding new product');
    }
});

// Actualizar un producto
router.put('/:id', async (req, res) => {
    try {
        const products = JSON.parse(await fs.readFile(productsFilePath, 'utf8'));
        const productId = parseInt(req.params.id, 10);
        const index = products.findIndex(p => p.id === productId);
        if (index === -1) {
            return res.status(404).send('Product not found');
        }
        products[index] = { ...products[index], ...req.body };
        await fs.writeFile(productsFilePath, JSON.stringify(products, null, 2));
        res.json(products[index]);
    } catch (error) {
        res.status(500).send('Error updating product');
    }
});

// Eliminar un producto
router.delete('/:id', async (req, res) => {
    try {
        const products = JSON.parse(await fs.readFile(productsFilePath, 'utf8'));
        const productId = parseInt(req.params.id, 10);
        const updatedProducts = products.filter(p => p.id !== productId);
        await fs.writeFile(productsFilePath, JSON.stringify(updatedProducts, null, 2));
        res.status(204).send();
    } catch (error) {
        res.status(500).send('Error deleting product');
    }
});

module.exports = router;
