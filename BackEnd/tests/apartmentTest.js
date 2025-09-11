const request = require('supertest');
const express = require('express');
const apartmentRoutes = require('../routes/apartmentRoutes'); // Adjust the path as necessary

// Mock your controller methods if needed
jest.mock('../Controllers/ApartmentController', () => ({
  createApartment: (req, res) => res.status(201).json({ message: 'created' }),
  getAllApartments: (req, res) => res.json([{ id: 1 }]),
  getApartmentById: (req, res) => res.json({ id: req.params.id }),
  updateApartment: (req, res) => res.json({ message: 'updated' }),
  deleteApartment: (req, res) => res.json({ message: 'deleted' }),
}));

const app = express();
app.use(express.json());
app.use('/apartments', apartmentRoutes);

describe('Apartment API', () => {
  it('should create an apartment', async () => {
    const res = await request(app).post('/apartments').send({ name: 'Apt 1' });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('created');
  });

  it('should get all apartments', async () => {
    const res = await request(app).get('/apartments');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should get apartment by id', async () => {
    const res = await request(app).get('/apartments/123');
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe('123');
  });

  it('should update apartment', async () => {
    const res = await request(app).put('/apartments/123').send({ name: 'Updated' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('updated');
  });

  it('should delete apartment', async () => {
    const res = await request(app).delete('/apartments/123');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('deleted');
  });
});