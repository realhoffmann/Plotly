fetch("data.json")
    .then(res => res.json())
    .then(data => {
        // -----------------------------------------------
        // 1) Prepare unique values for each existing filter
        // -----------------------------------------------
        
        // Neighborhoods
        const neighborhoods = [...new Set(data.map(row => row.NeighborhoodName))];

        // Years sold (parse "YrSold" like "01.01.2008" -> 2008)
        const uniqueYears = [
            ...new Set(
                data.map(d => parseInt(d.YrSold.split(".")[2], 10))
            )
        ].sort((a, b) => a - b);

        // Overall Condition
        const conditions = [
            ...new Set(data.map(d => +d.OverallCond))
        ].sort((a, b) => a - b);

        // -------------------------------------------
        // 2) Find min and max sale price in the data
        // -------------------------------------------
        const allPrices = data.map(d => +d.SalePrice);
        const minPrice = Math.min(...allPrices);
        const maxPrice = Math.max(...allPrices);

        // ---------------------------------------------------
        // 3) Get references to the select elements & sliders
        // ---------------------------------------------------
        const neighborhoodSelect = document.getElementById("neighborhoodSelect");
        const yearSelect = document.getElementById("yearSelect");
        const conditionSelect = document.getElementById("conditionSelect");

        const minPriceRange = document.getElementById("minPriceRange");
        const maxPriceRange = document.getElementById("maxPriceRange");

        const minPriceLabel = document.getElementById("minPriceLabel");
        const maxPriceLabel = document.getElementById("maxPriceLabel");

        // Single toggle button + year display
        const toggleBtn = document.getElementById("toggleBtn");
        const currentYearSpan = document.getElementById("currentYear");

        // -------------------------------------
        // 4) Populate the Neighborhood/Year/Condition dropdowns
        // -------------------------------------
        
        // Neighborhood
        const defaultNeighborhoodOption = document.createElement("option");
        defaultNeighborhoodOption.value = "";
        defaultNeighborhoodOption.text = "All Neighborhoods";
        neighborhoodSelect.appendChild(defaultNeighborhoodOption);

        neighborhoods.forEach(n => {
            const option = document.createElement("option");
            option.value = n;
            option.text = n;
            neighborhoodSelect.appendChild(option);
        });

        // Year Sold
        const defaultYearOption = document.createElement("option");
        defaultYearOption.value = "";
        defaultYearOption.text = "All Years";
        yearSelect.appendChild(defaultYearOption);

        uniqueYears.forEach(y => {
            const option = document.createElement("option");
            option.value = y;
            option.text = y;
            yearSelect.appendChild(option);
        });

        // Condition
        const defaultConditionOption = document.createElement("option");
        defaultConditionOption.value = "";
        defaultConditionOption.text = "All Conditions";
        conditionSelect.appendChild(defaultConditionOption);

        conditions.forEach(c => {
            const option = document.createElement("option");
            option.value = c;
            option.text = c;
            conditionSelect.appendChild(option);
        });

        // -------------------------------------
        // 5) Initialize the Price Range Sliders
        // -------------------------------------
        minPriceRange.min = minPrice;
        minPriceRange.max = maxPrice;
        minPriceRange.value = minPrice;
        minPriceRange.step = 1000; // Adjust as you like

        maxPriceRange.min = minPrice;
        maxPriceRange.max = maxPrice;
        maxPriceRange.value = maxPrice;
        maxPriceRange.step = 1000; // Adjust as you like

        minPriceLabel.textContent = minPriceRange.value;
        maxPriceLabel.textContent = maxPriceRange.value;

        // ----------------------------------
        // 6) Listen for filter/slider changes
        // ----------------------------------
        neighborhoodSelect.addEventListener("change", updateCharts);
        yearSelect.addEventListener("change", updateCharts);
        conditionSelect.addEventListener("change", updateCharts);

        minPriceRange.addEventListener("input", () => {
            minPriceLabel.textContent = minPriceRange.value;
            if (+minPriceRange.value > +maxPriceRange.value) {
                maxPriceRange.value = minPriceRange.value;
                maxPriceLabel.textContent = maxPriceRange.value;
            }
            updateCharts();
        });

        maxPriceRange.addEventListener("input", () => {
            maxPriceLabel.textContent = maxPriceRange.value;
            if (+maxPriceRange.value < +minPriceRange.value) {
                minPriceRange.value = maxPriceRange.value;
                minPriceLabel.textContent = minPriceRange.value;
            }
            updateCharts();
        });

        // ---------------------------------------------
        // 7) Single toggle button for Play/Pause
        // ---------------------------------------------
        let isPlaying = false;
        let currentYearIndex = 0;
        let animationTimer = null;

        // Called every time we move to the next year
        function stepAnimation() {
            if (!isPlaying) return;

            // Pick the year from the sorted list
            const thisYear = uniqueYears[currentYearIndex];
            // Set dropdown to that year
            yearSelect.value = thisYear;
            // Show the year in the UI
            currentYearSpan.textContent = `(Year: ${thisYear})`;

            updateCharts();

            // Move index forward
            currentYearIndex += 1;
            if (currentYearIndex >= uniqueYears.length) {
                currentYearIndex = 0;
            }

            // Schedule the next step after 1 second
            animationTimer = setTimeout(stepAnimation, 1000);
        }

        toggleBtn.addEventListener("click", () => {
            if (!isPlaying) {
                // Start playing
                isPlaying = true;
                toggleBtn.textContent = "Pause";
                stepAnimation(); 
            } else {
                // Pause
                isPlaying = false;
                toggleBtn.textContent = "Play";
                if (animationTimer) {
                    clearTimeout(animationTimer);
                }
            }
        });

        // ------------------------------------------
        // 8) Render charts initially with all data
        // ------------------------------------------
        renderCharts(data);

        // Called whenever a filter changes
        function updateCharts() {
            const selectedNeighborhood = neighborhoodSelect.value;
            const selectedYear = yearSelect.value;
            const selectedCondition = conditionSelect.value;
            const currentMinPrice = +minPriceRange.value;
            const currentMaxPrice = +maxPriceRange.value;

            let filtered = data;

            // Neighborhood filter
            if (selectedNeighborhood) {
                filtered = filtered.filter(
                    d => d.NeighborhoodName === selectedNeighborhood
                );
            }

            // Year Sold filter
            if (selectedYear) {
                filtered = filtered.filter(d => {
                    const year = parseInt(d.YrSold.split(".")[2], 10);
                    return year === +selectedYear;
                });
            }

            // Condition filter
            if (selectedCondition) {
                filtered = filtered.filter(
                    d => +d.OverallCond === +selectedCondition
                );
            }

            // Price Range filter
            filtered = filtered.filter(d => {
                const price = +d.SalePrice;
                return (price >= currentMinPrice && price <= currentMaxPrice);
            });

            renderCharts(filtered);
        }

        // ---------------------------------
        // 9) Define the renderCharts function
        // ---------------------------------
        function renderCharts(filteredData) {
            // (A) Sale Price Distribution (Histogram)
            Plotly.newPlot("histogram", [{
                x: filteredData.map(d => +d.SalePrice),
                type: "histogram"
            }], { title: "Sale Price Distribution" });

            // (B) GrLivArea vs SalePrice (Scatter)
            Plotly.newPlot("scatter", [{
                x: filteredData.map(d => +d.GrLivArea),
                y: filteredData.map(d => +d.SalePrice),
                mode: "markers",
                type: "scatter"
            }], { title: "GrLivArea vs SalePrice" });

            // (C) Sale Price by Neighborhood (Box Plot)
            const grouped = {};
            filteredData.forEach(d => {
                if (!grouped[d.NeighborhoodName]) {
                    grouped[d.NeighborhoodName] = [];
                }
                grouped[d.NeighborhoodName].push(+d.SalePrice);
            });
            const boxData = Object.entries(grouped).map(([name, values]) => ({
                y: values,
                name,
                type: "box"
            }));
            Plotly.newPlot("boxplot", boxData, { title: "Sale Price by Neighborhood" });

            // (D) Average Sale Price Over Time
            const timeMap = {};
            filteredData.forEach(d => {
                const year = parseInt(d.YrSold.split(".")[2], 10);
                if (!timeMap[year]) {
                    timeMap[year] = [];
                }
                timeMap[year].push(+d.SalePrice);
            });

            const sortedYears = Object.keys(timeMap)
                .map(y => parseInt(y, 10))
                .sort((a, b) => a - b);

            const avgPrices = sortedYears.map(year => {
                const prices = timeMap[year];
                return prices.reduce((sum, price) => sum + price, 0) / prices.length;
            });

            Plotly.newPlot("timeseries", [{
                x: sortedYears,
                y: avgPrices,
                type: "scatter",
                mode: "lines+markers"
            }], { title: "Average Sale Price Over Time" });
        }
    });