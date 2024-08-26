const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs').promises;

const productsRouter = require('./src/routes/products');

const app = express();
const port = 8080;
const server = http.createServer(app);
const io = socketIO(server);

app.engine('handlebars', engine({
    layoutsDir: path.join(__dirname, 'src/views/layouts'),
    defaultLayout: 'main',
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'src/views'));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/products', productsRouter);

app.get('/', async (req, res) => {
    try {
        const products = JSON.parse(await fs.readFile(path.join(__dirname, 'src/data/products.json'), 'utf8'));
        res.render('home', { products });
    } catch (error) {
        res.status(500).send('Error reading products data');
    }
});

app.get('/realtimeproducts', async (req, res) => {
    try {
        const products = JSON.parse(await fs.readFile(path.join(__dirname, 'src/data/products.json'), 'utf8'));
        res.render('realTimeProducts', { products });
    } catch (error) {
        res.status(500).send('Error reading products data');
    }
});

io.on('connection', async (socket) => {
    console.log('New client connected');

    try {
        const products = JSON.parse(await fs.readFile(path.join(__dirname, 'src/data/products.json'), 'utf8'));
        socket.emit('updateProducts', products);
    } catch (error) {
        console.error('Error emitting products data:', error);
    }

    socket.on('getCarts', async () => {
        try {
            const carts = JSON.parse(await fs.readFile(path.join(__dirname, 'src/data/carts.json'), 'utf8'));
            socket.emit('updateCarts', carts);
        } catch (error) {
            console.error('Error emitting carts data:', error);
        }
    });

    socket.on('newProduct', async (data) => {
        try {
            const products = JSON.parse(await fs.readFile(path.join(__dirname, 'src/data/products.json'), 'utf8'));
            const newProduct = {
                id: products.length ? Math.max(...products.map(p => p.id)) + 1 : 1,
                title: data.title,
                price: data.price
            };
            products.push(newProduct);
            await fs.writeFile(path.join(__dirname, 'src/data/products.json'), JSON.stringify(products, null, 2));
    
            io.emit('updateProducts', products);
        } catch (error) {
            console.error('Error adding new product:', error);
        }
    });

    socket.on('deleteProduct', async (id) => {
        try {
            const products = JSON.parse(await fs.readFile(path.join(__dirname, 'src/data/products.json'), 'utf8'));
            const updatedProducts = products.filter(p => p.id !== id);
            await fs.writeFile(path.join(__dirname, 'src/data/products.json'), JSON.stringify(updatedProducts, null, 2));

            const carts = JSON.parse(await fs.readFile(path.join(__dirname, 'src/data/carts.json'), 'utf8'));
            const updatedCarts = carts.filter(cartProduct => cartProduct.id !== id);
            await fs.writeFile(path.join(__dirname, 'src/data/carts.json'), JSON.stringify(updatedCarts, null, 2));

            io.emit('updateProducts', updatedProducts);
            io.emit('updateCarts', updatedCarts);
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    });

    socket.on('addProductToCart', async (productId) => {
        try {
            const carts = JSON.parse(await fs.readFile(path.join(__dirname, 'src/data/carts.json'), 'utf8'));
            const products = JSON.parse(await fs.readFile(path.join(__dirname, 'src/data/products.json'), 'utf8'));
            const product = products.find(p => p.id == productId);

            if (!product) {
                return;
            }

            const cartProduct = carts.find(p => p.id == productId);

            if (cartProduct) {
                cartProduct.quantity += 1;
            } else {
                carts.push({ id: productId, title: product.title, price: product.price, quantity: 1 });
            }

            await fs.writeFile(path.join(__dirname, 'src/data/carts.json'), JSON.stringify(carts, null, 2));
            io.emit('updateCarts', carts);
        } catch (error) {
            console.error('Error adding product to cart:', error);
        }
    });

    socket.on('removeProductFromCart', async (productId) => {
        try {
            const carts = JSON.parse(await fs.readFile(path.join(__dirname, 'src/data/carts.json'), 'utf8'));
            const updatedCarts = carts.filter(p => p.id !== productId);

            await fs.writeFile(path.join(__dirname, 'src/data/carts.json'), JSON.stringify(updatedCarts, null, 2));
            io.emit('updateCarts', updatedCarts);
        } catch (error) {
            console.error('Error removing product from cart:', error);
        }
    });

    socket.on('editProduct', async (data) => {
        try {
            const products = JSON.parse(await fs.readFile(path.join(__dirname, 'src/data/products.json'), 'utf8'));
            const productIndex = products.findIndex(p => p.id === data.id);

            if (productIndex !== -1) {
                products[productIndex].price = data.price;
                await fs.writeFile(path.join(__dirname, 'src/data/products.json'), JSON.stringify(products, null, 2));
                io.emit('updateProducts', products);
            }
        } catch (error) {
            console.error('Error editing product:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
